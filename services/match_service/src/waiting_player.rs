use std::{sync::Arc, time::Instant};

use crate::messages::ServerMessage;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::handshake::server::{ErrorResponse, Request, Response};
use uuid::Uuid;

pub struct PlayerInfoFactory {
    player_id: Arc<Mutex<Option<Uuid>>>,
    username: Arc<Mutex<Option<String>>>,
    avatar_url: Arc<Mutex<Option<String>>>,
}

impl Default for PlayerInfoFactory {
    fn default() -> Self {
        Self::new()
    }
}

impl PlayerInfoFactory {
    pub fn new() -> PlayerInfoFactory {
        PlayerInfoFactory {
            player_id: Arc::new(Mutex::new(None)),
            username: Arc::new(Mutex::new(None)),
            avatar_url: Arc::new(Mutex::new(None)),
        }
    }

    pub fn make_callback(
        &self,
    ) -> impl FnOnce(&Request, Response) -> Result<Response, ErrorResponse> {
        let player_id = Arc::clone(&self.player_id);
        let username = Arc::clone(&self.username);
        let avatar_url = Arc::clone(&self.avatar_url);

        move |req: &Request, resp: Response| {
            if let Some(player_id_str) = req
                .headers()
                .get("X-Player-Id")
                .and_then(|v| v.to_str().ok())
                && let Ok(uuid) = Uuid::parse_str(player_id_str)
                && let Ok(mut guard) = player_id.try_lock()
            {
                *guard = Some(uuid);
            }
            req.headers()
                .get("X-Username")
                .and_then(|v| v.to_str().ok())
                .map(|s| {
                    username
                        .try_lock()
                        .map(|mut guard| *guard = Some(s.to_owned()))
                });
            req.headers()
                .get("X-Avatar-Url")
                .and_then(|v| v.to_str().ok())
                .map(|s| {
                    avatar_url
                        .try_lock()
                        .map(|mut guard| *guard = Some(s.to_owned()))
                });
            Ok(resp)
        }
    }

    pub async fn into_player_info(self) -> PlayerInfo {
        let player_id = self.player_id.lock().await.unwrap_or_else(Uuid::new_v4);
        let username = self
            .username
            .lock()
            .await
            .clone()
            .unwrap_or_else(|| format!("Player-{}", &player_id.to_string()[..8]));
        let avatar_url = self.avatar_url.lock().await.clone();

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
    pub info: PlayerInfo,
    pub sender: mpsc::UnboundedSender<ServerMessage>,
    joined_at: std::time::Instant,
}

impl WaitingPlayer {
    pub fn new(info: PlayerInfo, sender: mpsc::UnboundedSender<ServerMessage>) -> Self {
        Self {
            info,
            sender,
            joined_at: Instant::now(),
        }
    }

    pub fn seconds_waiting(&self) -> u64 {
        self.joined_at.elapsed().as_secs()
    }
}

#[cfg(test)]
pub fn make_test_player(name: &str) -> (WaitingPlayer, mpsc::UnboundedReceiver<ServerMessage>) {
    let (tx, rx) = mpsc::unbounded_channel();
    let info = PlayerInfo::new(Uuid::new_v4(), name.into(), None);
    (WaitingPlayer::new(info, tx), rx)
}
