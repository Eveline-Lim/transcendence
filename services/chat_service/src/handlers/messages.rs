use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::{
    models::SendMessageRequest,
    state::{AppState, ChatMessage},
    utils::now_timestamp,
};

/// GET /chat/messages/:user_id — returns in-memory conversation history.
pub async fn get_messages(
    State(state): State<Arc<AppState>>,
    Path(other_id): Path<Uuid>,
) -> impl IntoResponse {
    // TODO: extract caller identity from X-User-Id header
    let caller_id = Uuid::nil(); // placeholder
    let key = AppState::conv_key(caller_id, other_id);
    let msgs = state.messages.get(&key).map(|v| v.clone()).unwrap_or_default();
    Json(msgs)
}

/// POST /chat/messages — send a message to a friend.
pub async fn send_message(
    State(state): State<Arc<AppState>>,
    Json(body): Json<SendMessageRequest>,
) -> impl IntoResponse {
    // TODO: extract caller identity from X-User-Id header
    let sender_id = Uuid::nil(); // placeholder
    let msg = ChatMessage {
        message_id: Uuid::new_v4(),
        sender_id,
        recipient_id: body.recipient_id,
        content: body.content,
        sent_at: now_timestamp(),
    };

    let key = AppState::conv_key(sender_id, msg.recipient_id);
    state.messages.entry(key).or_default().push(msg.clone());
    let _ = state.tx.send(msg.clone());

    (StatusCode::OK, Json(msg))
}
