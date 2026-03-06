use std::{sync::Arc, time::Instant};

use axum::{
    extract::{
        Query, State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::state::{AppState, ChatMessage};

#[derive(Deserialize)]
pub struct TicketQuery {
    ticket: Uuid,
}

/// GET /ws/chat?ticket=<uuid> — WebSocket upgrade endpoint.
///
/// The caller must first obtain a ticket from `GET /chat/ticket` and supply it
/// as a query parameter. Tickets are single-use and expire after 10 seconds.
pub async fn ws_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<TicketQuery>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    let entry = state.tickets.remove(&params.ticket);

    let user_id = match entry {
        Some((_, (uid, expiry))) if expiry > Instant::now() => uid,
        Some(_) => return (StatusCode::UNAUTHORIZED, "Ticket expired").into_response(),
        None => return (StatusCode::UNAUTHORIZED, "Invalid ticket").into_response(),
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, user_id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;

    fn build_app(state: Arc<AppState>) -> axum::Router {
        axum::Router::new()
            .route("/ws/chat", axum::routing::get(ws_handler))
            .with_state(state)
    }

    /// Spin up a real axum server on a random port and return its address.
    /// `WebSocketUpgrade` requires hyper's `OnUpgrade` extension, which is only
    /// present when a request flows through a real hyper connection —
    /// `tower::oneshot` skips hyper entirely so it cannot be used for these tests.
    async fn start_server(state: Arc<AppState>) -> std::net::SocketAddr {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let app = build_app(state);
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        addr
    }

    /// Send a raw HTTP/1.1 WebSocket upgrade request and return the status line.
    async fn ws_status_line(addr: std::net::SocketAddr, ticket: &str) -> String {
        let mut stream = TcpStream::connect(addr).await.unwrap();
        let request = format!(
            "GET /ws/chat?ticket={ticket} HTTP/1.1\r\n\
             Host: localhost\r\n\
             Connection: Upgrade\r\n\
             Upgrade: websocket\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             \r\n"
        );
        stream.write_all(request.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let n = stream.read(&mut buf).await.unwrap();
        String::from_utf8_lossy(&buf[..n])
            .lines()
            .next()
            .unwrap_or_default()
            .to_owned()
    }

    /// 400 when the `ticket` query parameter is missing entirely.
    #[tokio::test]
    async fn test_ws_missing_ticket_param_returns_bad_request() {
        let addr = start_server(Arc::new(AppState::new())).await;
        let mut stream = TcpStream::connect(addr).await.unwrap();
        let request = "GET /ws/chat HTTP/1.1\r\n\
             Host: localhost\r\n\
             Connection: Upgrade\r\n\
             Upgrade: websocket\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             \r\n";
        stream.write_all(request.as_bytes()).await.unwrap();
        let mut buf = vec![0u8; 1024];
        let n = stream.read(&mut buf).await.unwrap();
        let status = String::from_utf8_lossy(&buf[..n])
            .lines()
            .next()
            .unwrap_or_default()
            .to_owned();
        assert!(status.contains("400"), "Expected 400, got: {status}");
    }

    /// 401 when the ticket UUID is not in the store.
    #[tokio::test]
    async fn test_ws_unknown_ticket_returns_unauthorized() {
        let addr = start_server(Arc::new(AppState::new())).await;
        let status = ws_status_line(addr, &Uuid::new_v4().to_string()).await;
        assert!(status.contains("401"), "Expected 401, got: {status}");
    }

    /// 401 when the ticket exists but has already expired.
    #[tokio::test]
    async fn test_ws_expired_ticket_returns_unauthorized() {
        let state = Arc::new(AppState::new());
        let ticket = Uuid::new_v4();
        state.tickets.insert(
            ticket,
            (Uuid::new_v4(), Instant::now() - Duration::from_secs(1)),
        );

        let addr = start_server(Arc::clone(&state)).await;
        let status = ws_status_line(addr, &ticket.to_string()).await;
        assert!(status.contains("401"), "Expected 401, got: {status}");
    }

    /// 101 Switching Protocols for a valid ticket.
    /// The ticket must be consumed (single-use) after a successful upgrade.
    #[tokio::test]
    async fn test_ws_valid_ticket_upgrades_and_consumes_ticket() {
        let state = Arc::new(AppState::new());
        let ticket = Uuid::new_v4();
        state.tickets.insert(
            ticket,
            (Uuid::new_v4(), Instant::now() + Duration::from_secs(10)),
        );

        let addr = start_server(Arc::clone(&state)).await;
        let status = ws_status_line(addr, &ticket.to_string()).await;
        assert!(status.contains("101"), "Expected 101, got: {status}");

        // Ticket is single-use: must be gone from the store.
        assert!(!state.tickets.contains_key(&ticket));
    }

    /// Helper: perform a full WS upgrade and keep the TcpStream alive.
    /// Returns (stream, user_id) so the caller can close the connection later.
    async fn connect_ws(addr: std::net::SocketAddr, state: &Arc<AppState>) -> (TcpStream, Uuid) {
        let user_id = Uuid::new_v4();
        let ticket = Uuid::new_v4();
        state
            .tickets
            .insert(ticket, (user_id, Instant::now() + Duration::from_secs(10)));

        let mut stream = TcpStream::connect(addr).await.unwrap();
        let request = format!(
            "GET /ws/chat?ticket={ticket} HTTP/1.1\r\n\
             Host: localhost\r\n\
             Connection: Upgrade\r\n\
             Upgrade: websocket\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             \r\n"
        );
        stream.write_all(request.as_bytes()).await.unwrap();
        // Consume the 101 response.
        let mut buf = vec![0u8; 1024];
        let _ = stream.read(&mut buf).await.unwrap();

        (stream, user_id)
    }

    /// After a successful upgrade the user's sender is registered in ws_senders.
    #[tokio::test]
    async fn test_ws_registers_sender_on_connect() {
        let state = Arc::new(AppState::new());
        let addr = start_server(Arc::clone(&state)).await;

        let (_stream, user_id) = connect_ws(addr, &state).await;

        // Give handle_socket a moment to insert into ws_senders.
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(
            state.ws_senders.contains_key(&user_id),
            "ws_senders should contain the user after connect"
        );
    }

    /// After the socket closes the sender is removed from ws_senders.
    #[tokio::test]
    async fn test_ws_removes_sender_on_disconnect() {
        let state = Arc::new(AppState::new());
        let addr = start_server(Arc::clone(&state)).await;

        let (stream, user_id) = connect_ws(addr, &state).await;

        // Wait for registration.
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(state.ws_senders.contains_key(&user_id));

        // Drop the stream to simulate a client disconnect.
        drop(stream);

        // Poll until handle_socket detects the close and removes the entry,
        // giving up after 2 seconds.
        let deadline = Instant::now() + Duration::from_secs(2);
        loop {
            if !state.ws_senders.contains_key(&user_id) {
                break;
            }
            assert!(
                Instant::now() < deadline,
                "ws_senders was not cleaned up within 2 s"
            );
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    }
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>, user_id: Uuid) {
    // Create a personal inbox channel for this user and register it so that
    // `send_message` can deliver messages directly to this socket.
    let (tx, mut rx) = mpsc::channel::<ChatMessage>(32);
    state.ws_senders.insert(user_id, tx);

    loop {
        tokio::select! {
            // A message was routed to this user — forward it to the WS client.
            Some(msg) = rx.recv() => {
                let text = serde_json::to_string(&msg).unwrap_or_default();
                if socket.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
            // Handle any frame from the client.
            // `None`        — client closed the connection cleanly.
            // `Some(Err(_))`— connection dropped / network error.
            // `Some(Ok(Message::Close(_)))` — explicit WS close frame.
            result = socket.recv() => {
                match result {
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                    _ => {} // ping / pong / text from client — ignore for now
                }
            }
        }
    }

    // Always clean up so stale senders don't linger after the socket closes.
    state.ws_senders.remove(&user_id);
}
