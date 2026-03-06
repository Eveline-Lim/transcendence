use std::sync::Arc;
use std::time::{Duration, Instant};

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

use handlers::{messages, ticket, ws};
use state::AppState;

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState::new());

    // Background task: purge expired WS tickets every 30 seconds to prevent
    // unbounded growth from clients that requested tickets but never connected.
    {
        let state = Arc::clone(&state);
        tokio::spawn(async move {
            let interval = Duration::from_secs(30);
            loop {
                tokio::time::sleep(interval).await;
                let now = Instant::now();
                state.tickets.retain(|_, (_, expiry)| *expiry > now);
            }
        });
    }

    let app = Router::new()
        .route("/health", get(|| async { (StatusCode::OK, "OK") }))
        .route("/chat/ticket", get(ticket::get_ticket))
        .route("/chat/messages/{user_id}", get(messages::get_messages))
        .route("/chat/messages", post(messages::send_message))
        .route("/ws/chat", get(ws::ws_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Chat service listening on port 3000");
    axum::serve(listener, app).await.unwrap();
}
