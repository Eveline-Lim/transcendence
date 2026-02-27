use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
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
    /// Broadcast channel: each connected WS client subscribes to receive messages.
    pub tx: broadcast::Sender<ChatMessage>,
}

impl AppState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self {
            messages: DashMap::new(),
            tx,
        }
    }

    /// Canonical key so (a, b) and (b, a) map to the same conversation.
    pub fn conv_key(a: Uuid, b: Uuid) -> (Uuid, Uuid) {
        if a < b { (a, b) } else { (b, a) }
    }
}
