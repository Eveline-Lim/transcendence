use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Deserialised from `POST /chat/messages` request body.
/// Wire format uses camelCase (`recipientId`) to match the OpenAPI spec.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    pub recipient_id: Uuid,
    pub content: String,
}

/// Query parameters for `GET /chat/messages/:userId`.
#[derive(Deserialize)]
pub struct MessageQuery {
    #[serde(default = "default_limit")]
    pub limit: usize,
    #[serde(default)]
    pub offset: usize,
}

fn default_limit() -> usize {
    50
}

/// Response wrapper for `GET /chat/messages/:userId`.
/// Matches the `MessageHistory` schema in the OpenAPI spec.
#[derive(Serialize, Deserialize)]
pub struct MessageHistory {
    pub messages: Vec<crate::state::ChatMessage>,
    pub total: usize,
}
