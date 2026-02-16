use std::sync::Arc;

use crate::messages::ServerMessage;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::handshake::server::{ErrorResponse, Request, Response};
use uuid::Uuid;

pub struct PlayerInfoFabric {
    reader_player_id: Arc<Mutex<Option<Uuid>>>,
    reader_username: Arc<Mutex<Option<String>>>,
    reader_avatar: Arc<Mutex<Option<String>>>,
}

impl PlayerInfoFabric {
    pub fn new() -> PlayerInfoFabric {
        PlayerInfoFabric {
            reader_player_id: Arc::new(Mutex::new(None)),
            reader_username: Arc::new(Mutex::new(None)),
            reader_avatar: Arc::new(Mutex::new(None)),
        }
    }

    pub fn get_callback(
        &self,
    ) -> impl FnOnce(&Request, Response) -> Result<Response, ErrorResponse> {
        let writer_player_id = Arc::clone(&self.reader_player_id);
        let writer_username = Arc::clone(&self.reader_username);
        let writer_avatar = Arc::clone(&self.reader_avatar);

        move |req: &Request, resp: Response| {
            if let Some(player_id_str) = req
                .headers()
                .get("X-Player-Id")
                .and_then(|v| v.to_str().ok())
            {
                if let Ok(uuid) = Uuid::parse_str(player_id_str) {
                    if let Ok(mut guard) = writer_player_id.try_lock() {
                        *guard = Some(uuid);
                    }
                }
            }
            req.headers()
                .get("X-Username")
                .and_then(|v| v.to_str().ok())
                .map(|s| {
                    writer_username
                        .try_lock()
                        .map(|mut writer| *writer = Some(s.to_owned()))
                });
            req.headers()
                .get("X-Avatar-Url")
                .and_then(|v| v.to_str().ok())
                .map(|s| {
                    writer_avatar
                        .try_lock()
                        .map(|mut wr| *wr = Some(s.to_owned()))
                });
            Ok(resp)
        }
    }

    pub async fn into_player_info(self) -> PlayerInfo {
        let player_id = self
            .reader_player_id
            .lock()
            .await
            .clone()
            .unwrap_or_else(Uuid::new_v4);
        let username = self
            .reader_username
            .lock()
            .await
            .clone()
            .unwrap_or_else(|| format!("Player-{}", &player_id.to_string()[..8]));
        let avatar_url = self.reader_avatar.lock().await.clone();

        PlayerInfo::new(player_id, username, avatar_url)
    }
}

/// Player identity extracted from API Gateway headers.
///
/// Holds the player's identity data without any channel or queue coupling.
/// Used during handshake extraction and for profile-service lookups.
#[derive(Debug, Clone)]
pub struct PlayerInfo {
    pub id: Uuid,
    pub username: String,
    pub avatar_url: Option<String>,
}

impl PlayerInfo {
    pub fn new(id: Uuid, username: String, avatar_url: Option<String>) -> Self {
        Self {
            id,
            username,
            avatar_url,
        }
    }

    pub async fn get_rank(&self) -> u32 {
        //TODO: à finir (doit attendre le service profile)
        1000
    }
}

/// A player handle stored in a queue.
///
/// Combines [`PlayerInfo`] with a channel sender to push
/// [`ServerMessage`]s back to the player's WebSocket writer task.
/// The sender is cheaply cloneable and never blocks.
#[derive(Debug)]
pub struct WaitingPlayer {
    pub id: Uuid,
    pub username: String,
    pub avatar_url: Option<String>,
    pub sender: mpsc::UnboundedSender<ServerMessage>,
}

impl WaitingPlayer {
    pub fn new(info: PlayerInfo, sender: mpsc::UnboundedSender<ServerMessage>) -> Self {
        Self {
            id: info.id,
            username: info.username,
            avatar_url: info.avatar_url,
            sender,
        }
    }
}
