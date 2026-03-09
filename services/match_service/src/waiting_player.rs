use std::{sync::Arc, time::Instant};

use crate::messages::ServerMessage;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tokio_tungstenite::tungstenite::http::StatusCode;
use uuid::Uuid;

/// Shared state written by the WS handshake callback and read afterwards.
struct SharedPlayerInfo {
    player_id: Arc<Mutex<Option<Uuid>>>,
    username: Arc<Mutex<Option<String>>>,
    avatar_url: Arc<Mutex<Option<String>>>,
}

/// Builds the WS handshake callback and the shared-state handles needed to
/// read the result once the upgrade is complete.
pub struct PlayerInfoFactory {
    inner: Arc<SharedPlayerInfo>,
}

impl Default for PlayerInfoFactory {
    fn default() -> Self {
        Self::new()
    }
}

impl PlayerInfoFactory {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(SharedPlayerInfo {
                player_id: Arc::new(Mutex::new(None)),
                username: Arc::new(Mutex::new(None)),
                avatar_url: Arc::new(Mutex::new(None)),
            }),
        }
    }

    /// Returns a closure suitable for [`tokio_tungstenite::accept_hdr_async`].
    ///
    /// Reads API-Gateway-injected headers:
    /// - `X-User-Id`    – **required** UUID; connection is rejected with `401`
    ///   if absent or not a valid UUID.
    /// - `X-Username`   – optional display name.
    /// - `X-Avatar-Url` – optional avatar URL.
    ///
    /// Rejecting at this point (HTTP upgrade) means the TCP connection is
    /// closed before any WebSocket frame is exchanged.
    pub fn make_callback(
        &self,
    ) -> impl FnOnce(&Request, Response) -> Result<Response, ErrorResponse> {
        let player_id_slot = Arc::clone(&self.inner.player_id);
        let username_slot = Arc::clone(&self.inner.username);
        let avatar_url_slot = Arc::clone(&self.inner.avatar_url);

        move |req: &Request, resp: Response| {
            // --- X-User-Id (mandatory) ---
            let raw_id = req
                .headers()
                .get("X-User-Id")
                .and_then(|v| v.to_str().ok())
                .ok_or_else(|| {
                    let mut err = ErrorResponse::new(Some("Missing X-User-Id header".to_string()));
                    *err.status_mut() = StatusCode::UNAUTHORIZED;
                    err
                })?;

            let uuid = Uuid::parse_str(raw_id).map_err(|_| {
                let mut err = ErrorResponse::new(Some(
                    "Invalid X-User-Id header: not a valid UUID".to_string(),
                ));
                *err.status_mut() = StatusCode::UNAUTHORIZED;
                err
            })?;

            if let Ok(mut g) = player_id_slot.try_lock() {
                *g = Some(uuid);
            }

            // --- X-Username (optional) ---
            if let Some(name) = req
                .headers()
                .get("X-Username")
                .and_then(|v| v.to_str().ok())
                && let Ok(mut g) = username_slot.try_lock()
            {
                *g = Some(name.to_owned());
            }

            // --- X-Avatar-Url (optional) ---
            if let Some(url) = req
                .headers()
                .get("X-Avatar-Url")
                .and_then(|v| v.to_str().ok())
                && let Ok(mut g) = avatar_url_slot.try_lock()
            {
                *g = Some(url.to_owned());
            }

            Ok(resp)
        }
    }

    /// Consumes the factory and returns the player info collected during the
    /// handshake.  `X-User-Id` is always present here because `make_callback`
    /// already rejected connections that were missing it.
    pub async fn into_player_info(self) -> PlayerInfo {
        let player_id = self.inner.player_id.lock().await.expect(
            "player_id must be set; missing-header connections are rejected in make_callback",
        );
        let username = self
            .inner
            .username
            .lock()
            .await
            .clone()
            .unwrap_or_else(|| format!("Player-{}", &player_id.to_string()[..8]));
        let avatar_url = self.inner.avatar_url.lock().await.clone();

        PlayerInfo::new(player_id, username, avatar_url)
    }
}

// ---------------------------------------------------------------------------
// PlayerInfo
// ---------------------------------------------------------------------------

/// Player identity extracted from API-Gateway-injected headers.
///
/// The gateway validates the JWT and sets `X-User-Id` / `X-Username` /
/// `X-Avatar-Url` before forwarding the request.  The match service trusts
/// these headers and rejects connections where `X-User-Id` is absent (see
/// [`PlayerInfoFactory::make_callback`]).
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
    joined_at: Instant,
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
