use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub recipient_id: Uuid,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
pub struct WsTicketResponse {
    pub ticket: Uuid,
    pub expires_in: u32,
}
