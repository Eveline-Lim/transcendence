use std::sync::Arc;

use axum::{
    Router,
    http::StatusCode,
    routing::{get, post},
};

mod handlers;
mod models;
mod player_client;
mod state;
mod utils;

use handlers::{messages, ws};
use state::AppState;

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState::new());

    let app = Router::new()
        .route("/health", get(|| async { (StatusCode::OK, "OK") }))
        .route("/chat/messages/{user_id}", get(messages::get_messages))
        .route("/chat/messages", post(messages::send_message))
        .route("/ws/chat", get(ws::ws_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Chat service listening on port 3000");
    axum::serve(listener, app).await.unwrap();
}
