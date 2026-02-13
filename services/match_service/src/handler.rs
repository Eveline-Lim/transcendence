use std::sync::Arc;
use tokio::sync::Mutex;

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use uuid::Uuid;

use crate::AppState;
use crate::casual_queue::WaitingPlayer;
use crate::messages::*;

/// Extract player information from API Gateway headers.
///
/// **Production Pattern**: API Gateway validates JWT and passes claims via headers:
/// - `X-Player-Id`: Player UUID (validated by gateway)
/// - `X-Username`: Player username
/// - `X-Avatar-Url`: Player avatar URL (optional)
///
/// **Why this approach?**
/// - Centralized auth at API Gateway (single point of validation)
/// - Backend services are simpler and don't need JWT secrets
/// - Gateway can enforce consistent auth policies across all services
/// - Services behind gateway are not exposed to public internet
///
/// **Development Mode**: When no headers are present (direct connection),
/// generates test users automatically.
pub async fn extract_player_from_handshake(
    stream: TcpStream,
) -> Result<
    (
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Uuid,
        String,
        Option<String>,
    ),
    String,
> {
    let reader_player_id: Arc<Mutex<Option<Uuid>>> = Arc::new(Mutex::new(None));
    let reader_username: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let reader_avatar: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));

    let writer_player_id = Arc::clone(&reader_player_id);
    let writer_username = Arc::clone(&reader_username);
    let writer_avatar = Arc::clone(&reader_avatar);

    let callback = move |req: &Request, resp: Response| {
        if let Some(player_id_str) = req
            .headers()
            .get("X-Player-Id")
            .and_then(|v| v.to_str().ok())
        {
            if let Ok(uuid) = Uuid::parse_str(player_id_str) {
                if let Ok(mut guard) = writer_player_id.try_lock() {
                    *guard = Some(uuid);
                }
            }
        }
        req.headers()
            .get("X-Username")
            .and_then(|v| v.to_str().ok())
            .map(|s| {
                writer_username
                    .try_lock()
                    .map(|mut writer| *writer = Some(s.to_owned()))
            });
        req.headers()
            .get("X-Avatar-Url")
            .and_then(|v| v.to_str().ok())
            .map(|s| {
                writer_avatar
                    .try_lock()
                    .map(|mut wr| *wr = Some(s.to_owned()))
            });
        Ok(resp)
    };

    let ws_stream = tokio_tungstenite::accept_hdr_async(stream, callback)
        .await
        .map_err(|e| format!("WebSocket handshake failed: {}", e))?;

    let player_id = reader_player_id
        .lock()
        .await
        .clone()
        .unwrap_or_else(Uuid::new_v4);
    let username = reader_username
        .lock()
        .await
        .clone()
        .unwrap_or_else(|| format!("Player-{}", &player_id.to_string()[..8]));
    let avatar_url = reader_avatar.lock().await.clone();

    Ok((ws_stream, player_id, username, avatar_url))
}

pub async fn handle_connection(stream: TcpStream, state: Arc<AppState>) {
    let (ws_stream, player_id, username, avatar_url) =
        match extract_player_from_handshake(stream).await {
            Ok(data) => data,
            Err(e) => {
                error!("Connection rejected: {}", e);
                return;
            }
        };

    info!("[{}] connected as {}", player_id, username);

    let (mut ws_sink, mut ws_source) = ws_stream.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<ServerMessage>();

    let writer = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            match serde_json::to_string(&msg) {
                Ok(text) => {
                    if ws_sink.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
                Err(e) => error!("serialize error: {}", e),
            }
        }
    });

    let mut current_mode: Option<GameMode> = None;

    while let Some(Ok(msg)) = ws_source.next().await {
        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => break,
            _ => continue,
        };

        let client_msg: ClientMessage = match serde_json::from_str(&text) {
            Ok(m) => m,
            Err(e) => {
                warn!("[{}] bad message: {}", player_id, e);
                continue;
            }
        };

        match client_msg {
            ClientMessage::JoinQueue { data } => {
                let mode = data.map(|d| d.game_mode).unwrap_or_default();

                if let Some(prev) = current_mode.take() {
                    remove_from_queue(&state, player_id, prev).await;
                }

                info!("[{}] joining {:?} queue", player_id, mode);

                let player = WaitingPlayer {
                    id: player_id,
                    username: username.clone(),
                    avatar_url: avatar_url.clone(),
                    sender: tx.clone(),
                };

                let matched = match mode {
                    GameMode::Casual => state.casual.lock().await.enqueue(player),
                    GameMode::Ranked => state.ranked.lock().await.enqueue(player, 1000),
                };

                if let Some((p1, p2)) = matched {
                    send_match_found(p1, p2);
                } else {
                    current_mode = Some(mode);
                }
            }
            ClientMessage::LeaveQueue => {
                if let Some(mode) = current_mode.take() {
                    info!("[{}] leaving {:?} queue", player_id, mode);
                    remove_from_queue(&state, player_id, mode).await;
                }
            }
        }
    }

    if let Some(mode) = current_mode.take() {
        info!(
            "[{}] disconnected, removing from {:?} queue",
            player_id, mode
        );
        remove_from_queue(&state, player_id, mode).await;
    }

    writer.abort();
    info!("[{}] connection closed", player_id);
}

async fn remove_from_queue(state: &AppState, player_id: Uuid, mode: GameMode) {
    match mode {
        GameMode::Casual => {
            state.casual.lock().await.dequeue(player_id);
        }
        GameMode::Ranked => {
            state.ranked.lock().await.dequeue(player_id);
        }
    }
}

fn send_match_found(p1: WaitingPlayer, p2: WaitingPlayer) {
    let match_id = Uuid::new_v4();
    // TODO: ici utiliser le service game
    let game_url = format!("ws://localhost:9090/game/{}", match_id);
    let msg_for_p1 = ServerMessage::MatchFound {
        data: MatchFoundData {
            match_id,
            game_engine_url: game_url.clone(),
            opponent: OpponentInfo {
                username: p2.username.clone(),
                avatar_url: p2.avatar_url.clone(),
            },
        },
    };

    let msg_for_p2 = ServerMessage::MatchFound {
        data: MatchFoundData {
            match_id,
            game_engine_url: game_url,
            opponent: OpponentInfo {
                username: p1.username.clone(),
                avatar_url: p1.avatar_url.clone(),
            },
        },
    };

    let _ = p1.sender.send(msg_for_p1);
    let _ = p2.sender.send(msg_for_p2);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn extract_player_with_all_headers() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            extract_player_from_handshake(stream).await
        });

        let mut client = tokio::net::TcpStream::connect(addr).await.unwrap();

        let test_uuid = "550e8400-e29b-41d4-a716-446655440000";
        let handshake = format!(
            "GET / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Upgrade: websocket\r\n\
             Connection: Upgrade\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             X-Player-Id: {}\r\n\
             X-Username: alice\r\n\
             X-Avatar-Url: https://example.com/alice.jpg\r\n\
             \r\n",
            test_uuid
        );

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let _ = client.read(&mut buf).await.unwrap();

        let result = server.await.unwrap();
        assert!(result.is_ok());

        let (_, player_id, username, avatar_url) = result.unwrap();
        assert_eq!(player_id.to_string(), test_uuid);
        assert_eq!(username, "alice");
        assert_eq!(
            avatar_url,
            Some("https://example.com/alice.jpg".to_string())
        );
    }

    #[tokio::test]
    async fn extract_player_with_minimal_headers() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            extract_player_from_handshake(stream).await
        });

        let mut client = tokio::net::TcpStream::connect(addr).await.unwrap();

        let test_uuid = "661e9511-f39c-52e5-b827-557766551111";
        let handshake = format!(
            "GET / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Upgrade: websocket\r\n\
             Connection: Upgrade\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             X-Player-Id: {}\r\n\
             X-Username: bob\r\n\
             \r\n",
            test_uuid
        );

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let _ = client.read(&mut buf).await.unwrap();

        let result = server.await.unwrap();
        assert!(result.is_ok());

        let (_, player_id, username, avatar_url) = result.unwrap();
        assert_eq!(player_id.to_string(), test_uuid);
        assert_eq!(username, "bob");
        assert_eq!(avatar_url, None);
    }

    #[tokio::test]
    async fn extract_player_with_no_headers() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            extract_player_from_handshake(stream).await
        });

        let mut client = tokio::net::TcpStream::connect(addr).await.unwrap();

        let handshake = "GET / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Upgrade: websocket\r\n\
             Connection: Upgrade\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             \r\n";

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let _ = client.read(&mut buf).await.unwrap();

        let result = server.await.unwrap();
        assert!(result.is_ok());

        let (_, player_id, username, avatar_url) = result.unwrap();

        assert!(Uuid::parse_str(&player_id.to_string()).is_ok());
        assert!(username.starts_with("Player-"));
        assert_eq!(avatar_url, None);
    }

    #[tokio::test]
    async fn extract_player_with_invalid_uuid() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            extract_player_from_handshake(stream).await
        });

        let mut client = tokio::net::TcpStream::connect(addr).await.unwrap();

        let handshake = "GET / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Upgrade: websocket\r\n\
             Connection: Upgrade\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             X-Player-Id: not-a-valid-uuid\r\n\
             X-Username: charlie\r\n\
             \r\n";

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let _ = client.read(&mut buf).await.unwrap();

        let result = server.await.unwrap();
        assert!(result.is_ok());

        let (_, player_id, username, _) = result.unwrap();

        assert!(Uuid::parse_str(&player_id.to_string()).is_ok());
        assert_eq!(username, "charlie");
    }

    #[tokio::test]
    async fn connection_with_api_gateway_headers() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let state = Arc::new(AppState::new());

        let s = Arc::clone(&state);
        let server = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            handle_connection(stream, s).await;
        });

        let mut client = tokio::net::TcpStream::connect(addr).await.unwrap();

        let test_uuid = "772e9622-g40d-63f6-c938-668877662222";
        let handshake = format!(
            "GET / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Upgrade: websocket\r\n\
             Connection: Upgrade\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             X-Player-Id: {}\r\n\
             X-Username: dave\r\n\
             X-Avatar-Url: https://example.com/dave.jpg\r\n\
             \r\n",
            test_uuid
        );

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let n = client.read(&mut buf).await.unwrap();
        assert!(n > 0);

        let response = String::from_utf8_lossy(&buf[..n]);
        assert!(response.contains("101"));

        tokio::time::sleep(std::time::Duration::from_millis(10)).await;

        drop(client);
        drop(server);
    }
}
