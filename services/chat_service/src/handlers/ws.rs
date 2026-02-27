use std::sync::Arc;

use axum::{
    extract::{State, WebSocketUpgrade},
    extract::ws::{Message, WebSocket},
    response::IntoResponse,
};

use crate::state::AppState;

/// GET /ws/chat — WebSocket upgrade endpoint.
pub async fn ws_handler(
    State(state): State<Arc<AppState>>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    // TODO: validate ticket query param before upgrading
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.tx.subscribe();
    loop {
        tokio::select! {
            // Forward incoming broadcast messages to this client
            Ok(msg) = rx.recv() => {
                let text = serde_json::to_string(&msg).unwrap_or_default();
                if socket.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
            // Handle messages from the client (ping/close)
            Some(Ok(msg)) = socket.recv() => {
                if let Message::Close(_) = msg { break; }
            }
            else => break,
        }
    }
}
