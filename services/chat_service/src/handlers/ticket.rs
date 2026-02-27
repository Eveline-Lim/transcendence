use std::sync::Arc;

use axum::{Json, response::IntoResponse};
use uuid::Uuid;

use crate::{models::WsTicketResponse, state::AppState};

/// GET /chat/ticket — issues a short-lived WS connection ticket.
pub async fn get_ticket() -> impl IntoResponse {
    // TODO: validate JWT from X-User-Id header, store ticket in a short-lived map
    Json(WsTicketResponse {
        ticket: Uuid::new_v4(),
        expires_in: 10,
    })
}
