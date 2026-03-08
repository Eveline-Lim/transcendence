use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use crate::AppState;
use crate::messages::*;
use crate::waiting_player::{PlayerInfo, PlayerInfoFactory, WaitingPlayer};

/// Extract player information from API Gateway headers.
///
/// **Security model**: the API Gateway validates the JWT and injects identity
/// headers before forwarding the WebSocket upgrade to this service:
/// - `X-User-Id`   – player UUID (mandatory; connection rejected with `401` if absent)
/// - `X-Username`  – display name (optional)
/// - `X-Avatar-Url`– avatar URL (optional)
///
/// Because the match service is not exposed to the public internet (only the
/// gateway can reach it), these headers can be trusted as-is.
/// Connections that arrive without `X-User-Id` — e.g. attempts to bypass the
/// gateway — are rejected during the HTTP upgrade handshake.
pub async fn extract_player_from_handshake(
    stream: TcpStream,
) -> Result<(tokio_tungstenite::WebSocketStream<TcpStream>, PlayerInfo), String> {
    let factory = PlayerInfoFactory::new();
    let callback = factory.make_callback();

    let ws_stream = tokio_tungstenite::accept_hdr_async(stream, callback)
        .await
        .map_err(|e| format!("WebSocket handshake failed: {}", e))?;

    let info = factory.into_player_info().await;

    Ok((ws_stream, info))
}

pub async fn handle_connection(stream: TcpStream, state: Arc<AppState>) {
    let (ws_stream, info) = match extract_player_from_handshake(stream).await {
        Ok(data) => data,
        Err(e) => {
            error!("Connection rejected: {}", e);
            return;
        }
    };

    info!("[{}] connected as {}", info.id, info.username);

    let (mut ws_sink, mut ws_reader) = ws_stream.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<ServerMessage>();

    let writer_task = tokio::spawn(async move {
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

    while let Some(Ok(msg)) = ws_reader.next().await {
        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => break,
            _ => continue,
        };

        let client_msg: ClientMessage = match serde_json::from_str(&text) {
            Ok(m) => m,
            Err(e) => {
                warn!("[{}] bad message: {}", info.id, e);
                continue;
            }
        };

        match client_msg {
            ClientMessage::JoinQueue { data } => {
                let mode = data.map(|d| d.game_mode).unwrap_or_default();

                if let Some(prev) = current_mode.take() {
                    remove_from_queue(&state, info.id, prev).await;
                }

                info!("[{}] joining {:?} queue", info.id, mode);

                let player = WaitingPlayer::new(info.clone(), tx.clone());

                let matched = match mode {
                    GameMode::Casual => state.casual.lock().await.enqueue(player),
                    GameMode::Ranked => {
                        let mmr = state.player_client.fetch_elo(info.id).await;
                        state.ranked.lock().await.enqueue(player, mmr)
                    }
                };

                if let Some((p1, p2)) = matched {
                    send_match_found(p1, p2);
                } else {
                    current_mode = Some(mode);
                }
            }
            ClientMessage::LeaveQueue => {
                if let Some(mode) = current_mode.take() {
                    info!("[{}] leaving {:?} queue", info.id, mode);
                    remove_from_queue(&state, info.id, mode).await;
                }
            }
        }
    }

    if let Some(mode) = current_mode.take() {
        info!("[{}] disconnected, removing from {:?} queue", info.id, mode);
        remove_from_queue(&state, info.id, mode).await;
    }

    writer_task.abort();
    info!("[{}] connection closed", info.id);
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
                username: p2.info.username.clone(),
                avatar_url: p2.info.avatar_url.clone(),
            },
        },
    };

    let msg_for_p2 = ServerMessage::MatchFound {
        data: MatchFoundData {
            match_id,
            game_engine_url: game_url,
            opponent: OpponentInfo {
                username: p1.info.username.clone(),
                avatar_url: p1.info.avatar_url.clone(),
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
             X-User-Id: {}\r\n\
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

        let (_, info) = result.unwrap();
        assert_eq!(info.id.to_string(), test_uuid);
        assert_eq!(info.username, "alice");
        assert_eq!(
            info.avatar_url,
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
             X-User-Id: {}\r\n\
             X-Username: bob\r\n\
             \r\n",
            test_uuid
        );

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let _ = client.read(&mut buf).await.unwrap();

        let result = server.await.unwrap();
        assert!(result.is_ok());

        let (_, info) = result.unwrap();
        assert_eq!(info.id.to_string(), test_uuid);
        assert_eq!(info.username, "bob");
        assert_eq!(info.avatar_url, None);
    }

    /// Connection without `X-User-Id` must be rejected during the WS upgrade
    /// (the handshake callback returns HTTP 401 and `extract_player_from_handshake`
    /// propagates the error).
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
        let n = client.read(&mut buf).await.unwrap();

        // Server must reply with 401, not 101
        let response = String::from_utf8_lossy(&buf[..n]);
        assert!(
            response.contains("401"),
            "expected 401 Unauthorized, got: {response}"
        );

        let result = server.await.unwrap();
        assert!(
            result.is_err(),
            "expected Err when X-User-Id is absent, got Ok"
        );
    }

    /// A malformed (non-UUID) `X-User-Id` header must also be rejected with 401.
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
             X-User-Id: not-a-valid-uuid\r\n\
             X-Username: charlie\r\n\
             \r\n";

        client.write_all(handshake.as_bytes()).await.unwrap();

        let mut buf = vec![0u8; 1024];
        let n = client.read(&mut buf).await.unwrap();

        let response = String::from_utf8_lossy(&buf[..n]);
        assert!(
            response.contains("401"),
            "expected 401 Unauthorized, got: {response}"
        );

        let result = server.await.unwrap();
        assert!(
            result.is_err(),
            "expected Err for invalid UUID in X-User-Id, got Ok"
        );
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

        let test_uuid = "772fa622-a40d-43f6-a938-668877662222";
        let handshake = format!(
            "GET / HTTP/1.1\r\n\
             Host: localhost\r\n\
             Upgrade: websocket\r\n\
             Connection: Upgrade\r\n\
             Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
             Sec-WebSocket-Version: 13\r\n\
             X-User-Id: {}\r\n\
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
