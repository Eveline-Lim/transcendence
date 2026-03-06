use std::time::Instant;

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use uuid::Uuid;

/// A chat message stored in memory.
#[derive(Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub message_id: Uuid,
    pub sender_id: Uuid,
    pub recipient_id: Uuid,
    pub content: String,
    pub sent_at: String,
}

/// Global application state shared across all handlers.
pub struct AppState {
    /// In-memory message store: key = sorted pair of user UUIDs, value = messages.
    pub messages: DashMap<(Uuid, Uuid), Vec<ChatMessage>>,
    /// Per-user WebSocket inbox. Inserted on WS connect, removed on disconnect.
    /// Sending to an entry delivers a message only to that user's open socket.
    pub ws_senders: DashMap<Uuid, mpsc::Sender<ChatMessage>>,
    /// Short-lived WS connection tickets: ticket UUID → (user_id, expiry).
    pub tickets: DashMap<Uuid, (Uuid, Instant)>,
    /// Shared HTTP client for outbound service calls (keep-alive, connection pool).
    pub http_client: reqwest::Client,
    /// Base URL of the Player Service, e.g. `http://player-service:3001/api/v1`.
    /// Read from the `PLAYER_SERVICE_URL` environment variable.
    pub player_service_url: String,
}

impl AppState {
    pub fn new() -> Self {
        let player_service_url = std::env::var("PLAYER_SERVICE_URL")
            .unwrap_or_else(|_| "http://player-service:3001/api/v1".to_string());
        Self {
            messages: DashMap::new(),
            ws_senders: DashMap::new(),
            tickets: DashMap::new(),
            http_client: reqwest::Client::new(),
            player_service_url,
        }
    }

    /// Builds state pointing at a custom player-service URL — useful in tests.
    pub fn new_with_player_service_url(player_service_url: String) -> Self {
        Self {
            messages: DashMap::new(),
            ws_senders: DashMap::new(),
            tickets: DashMap::new(),
            http_client: reqwest::Client::new(),
            player_service_url,
        }
    }

    /// Canonical key so (a, b) and (b, a) map to the same conversation.
    pub fn conv_key(a: Uuid, b: Uuid) -> (Uuid, Uuid) {
        if a < b { (a, b) } else { (b, a) }
    }
}
