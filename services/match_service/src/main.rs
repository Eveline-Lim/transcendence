use std::env;
use std::sync::Arc;

use log::info;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

pub mod casual_queue;
pub mod handler;
pub mod messages;
pub mod ranked_queue;
pub mod waiting_player;

use casual_queue::CasualQueue;
use handler::handle_connection;
use ranked_queue::RankedQueue;

pub struct AppState {
    pub casual: Mutex<CasualQueue>,
    pub ranked: Mutex<RankedQueue>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            casual: Mutex::new(CasualQueue::new()),
            ranked: Mutex::new(RankedQueue::new()),
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    let addr = env::args()
        .nth(1)
        .unwrap_or_else(|| "127.0.0.1:8080".to_string());

    let listener = TcpListener::bind(&addr).await?;
    info!("Listening on: {}", addr);

    let state = Arc::new(AppState::new());

    while let Ok((stream, addr)) = listener.accept().await {
        info!("New connection from {}", addr);
        let state = Arc::clone(&state);
        tokio::spawn(handle_connection(stream, state));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::connect_async;
    use tokio_tungstenite::tungstenite::Message;

    use crate::messages::*;

    async fn start_server() -> (String, Arc<AppState>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap().to_string();
        let state = Arc::new(AppState::new());
        let s = Arc::clone(&state);
        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let s = Arc::clone(&s);
                tokio::spawn(handle_connection(stream, s));
            }
        });
        (addr, state)
    }

    async fn ws_connect(
        addr: &str,
    ) -> tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>
    {
        let (ws, _) = connect_async(format!("ws://{}", addr)).await.unwrap();
        ws
    }

    async fn next_server_msg(
        ws: &mut tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
    ) -> ServerMessage {
        loop {
            let msg = ws.next().await.unwrap().unwrap();
            if let Message::Text(t) = msg {
                return serde_json::from_str(&t).unwrap();
            }
        }
    }

    #[tokio::test]
    async fn join_queue_receives_update() {
        let (addr, _) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#.into(),
        ))
        .await
        .unwrap();

        match next_server_msg(&mut ws).await {
            ServerMessage::QueueUpdate { data } => {
                assert_eq!(data.players_waiting, 1);
            }
            other => panic!("expected QueueUpdate, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn two_players_get_matched() {
        let (addr, _) = start_server().await;
        let mut ws1 = ws_connect(&addr).await;
        let mut ws2 = ws_connect(&addr).await;

        ws1.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#.into(),
        ))
        .await
        .unwrap();
        assert!(matches!(
            next_server_msg(&mut ws1).await,
            ServerMessage::QueueUpdate { .. }
        ));

        ws2.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#.into(),
        ))
        .await
        .unwrap();

        let m1 = next_server_msg(&mut ws1).await;
        let m2 = next_server_msg(&mut ws2).await;

        let (d1, d2) = match (&m1, &m2) {
            (ServerMessage::MatchFound { data: d1 }, ServerMessage::MatchFound { data: d2 }) => {
                (d1, d2)
            }
            _ => panic!("expected MatchFound for both players"),
        };

        assert_eq!(d1.match_id, d2.match_id);
        assert_ne!(d1.opponent.username, d2.opponent.username);
    }

    #[tokio::test]
    async fn leave_queue_before_match() {
        let (addr, state) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#.into(),
        ))
        .await
        .unwrap();
        let _ = next_server_msg(&mut ws).await;

        assert_eq!(state.casual.lock().await.len(), 1);

        ws.send(Message::Text(r#"{"event":"leave_queue"}"#.into()))
            .await
            .unwrap();

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        assert_eq!(state.casual.lock().await.len(), 0);
    }

    #[tokio::test]
    async fn disconnect_cleans_up_queue() {
        let (addr, state) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#.into(),
        ))
        .await
        .unwrap();
        let _ = next_server_msg(&mut ws).await;
        assert_eq!(state.casual.lock().await.len(), 1);

        drop(ws);
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        assert_eq!(state.casual.lock().await.len(), 0);
    }

    #[tokio::test]
    async fn invalid_message_is_ignored() {
        let (addr, _) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text("not json".into())).await.unwrap();

        ws.send(Message::Text(r#"{"event":"join_queue"}"#.into()))
            .await
            .unwrap();

        match next_server_msg(&mut ws).await {
            ServerMessage::QueueUpdate { .. } => {}
            other => panic!("expected QueueUpdate, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn default_game_mode_is_casual() {
        let (addr, state) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text(r#"{"event":"join_queue"}"#.into()))
            .await
            .unwrap();
        let _ = next_server_msg(&mut ws).await;

        assert_eq!(state.casual.lock().await.len(), 1);
        assert_eq!(state.ranked.lock().await.len(), 0);
    }

    #[tokio::test]
    async fn ranked_queue_integration() {
        let (addr, state) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"ranked"}}"#.into(),
        ))
        .await
        .unwrap();
        let _ = next_server_msg(&mut ws).await;

        assert_eq!(state.casual.lock().await.len(), 0);
        assert_eq!(state.ranked.lock().await.len(), 1);
    }

    #[tokio::test]
    async fn switch_queue_leaves_previous() {
        let (addr, state) = start_server().await;
        let mut ws = ws_connect(&addr).await;

        ws.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#.into(),
        ))
        .await
        .unwrap();
        let _ = next_server_msg(&mut ws).await;
        assert_eq!(state.casual.lock().await.len(), 1);

        ws.send(Message::Text(
            r#"{"event":"join_queue","data":{"gameMode":"ranked"}}"#.into(),
        ))
        .await
        .unwrap();
        let _ = next_server_msg(&mut ws).await;

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        assert_eq!(state.casual.lock().await.len(), 0);
        assert_eq!(state.ranked.lock().await.len(), 1);
    }
}
