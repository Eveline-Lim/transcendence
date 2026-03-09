use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// Maximum message content length. Must match `maxLength` in chat_service.yml.
pub const MAX_CONTENT_LEN: u64 = 1000;

/// Deserialised from `POST /chat/messages` request body.
/// Wire format uses camelCase (`recipientId`) to match the OpenAPI spec.
/// `content` is validated: 1–1000 characters (non-empty, max matches chat_service.yml).
#[derive(Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    pub recipient_id: Uuid,
    #[validate(length(
        min = 1,
        max = MAX_CONTENT_LEN,
        message = "content must be between 1 and 1000 characters"
    ))]
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
