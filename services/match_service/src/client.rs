use std::env;

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::main]
async fn main() {
    env_logger::init();

    let url = env::args()
        .nth(1)
        .unwrap_or_else(|| "ws://127.0.0.1:8080".to_string());

    info!("Connecting to {url}...");
    let (ws, _) = connect_async(&url).await.expect("Failed to connect");
    info!("Connected!  Commands: join [casual|ranked], leave, quit");

    let (mut sink, mut source) = ws.split();

    let printer = tokio::spawn(async move {
        while let Some(Ok(msg)) = source.next().await {
            if let Message::Text(text) = msg {
                info!("← {text}");
            }
        }
        info!("Connection closed by server.");
    });

    let reader = BufReader::new(tokio::io::stdin());
    let mut lines = reader.lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let json = match line.trim() {
            "join" | "join casual" => r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#,
            "join ranked" => r#"{"event":"join_queue","data":{"gameMode":"ranked"}}"#,
            "leave" => r#"{"event":"leave_queue"}"#,
            "quit" => break,
            other => {
                warn!("Unknown command: {other}.  Try: join, join ranked, leave, quit");
                continue;
            }
        };

        info!("→ {json}");
        if sink.send(Message::Text(json.into())).await.is_err() {
            error!("Failed to send message");
            break;
        }
    }

    printer.abort();
}
