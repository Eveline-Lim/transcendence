use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use uuid::Uuid;

/// A chat message stored in memory.
///
/// Wire format uses camelCase (`messageId`, `senderId`, ...) to match the
/// OpenAPI/AsyncAPI specs. The in-memory Vec has no size cap — a busy chat
/// can grow unbounded. Bound this with a ring-buffer or external store
/// before enabling the service in production.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    /// Shared HTTP client for outbound service calls (keep-alive, connection pool).
    pub http_client: reqwest::Client,
    /// Base URL of the Player Service, e.g. `http://player_service:8080/api/v1`.
    /// Override with the `PLAYER_SERVICE_URL` environment variable.
    pub player_service_url: String,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    pub fn new() -> Self {
        // Default matches the Compose service name and port used by nginx.
        // Set PLAYER_SERVICE_URL explicitly if the service is reachable at a
        // different address (e.g. in integration tests).
        let player_service_url = std::env::var("PLAYER_SERVICE_URL")
            .unwrap_or_else(|_| "http://player_service:8080/api/v1".to_string());
        Self {
            messages: DashMap::new(),
            ws_senders: DashMap::new(),
            http_client: reqwest::Client::new(),
            player_service_url,
        }
    }

    /// Builds state pointing at a custom player-service URL — useful in tests.
    #[cfg(test)]
    pub fn new_with_player_service_url(player_service_url: String) -> Self {
        Self {
            messages: DashMap::new(),
            ws_senders: DashMap::new(),
            http_client: reqwest::Client::new(),
            player_service_url,
        }
    }

    /// Canonical key so (a, b) and (b, a) map to the same conversation.
    pub fn conv_key(a: Uuid, b: Uuid) -> (Uuid, Uuid) {
        if a < b { (a, b) } else { (b, a) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conv_key_order_independent() {
        let a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();

        assert_eq!(AppState::conv_key(a, b), AppState::conv_key(b, a));
    }

    #[test]
    fn test_conv_key_returns_smaller_first() {
        let smaller = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let larger = Uuid::parse_str("ffffffff-ffff-ffff-ffff-ffffffffffff").unwrap();

        let (first, second) = AppState::conv_key(larger, smaller);
        assert_eq!(first, smaller);
        assert_eq!(second, larger);
    }

    #[test]
    fn test_conv_key_same_uuid() {
        let id = Uuid::new_v4();
        let (first, second) = AppState::conv_key(id, id);
        assert_eq!(first, id);
        assert_eq!(second, id);
    }

    #[test]
    fn test_default_impl() {
        let state = AppState::default();
        assert!(state.messages.is_empty());
        assert!(state.ws_senders.is_empty());
    }
}
