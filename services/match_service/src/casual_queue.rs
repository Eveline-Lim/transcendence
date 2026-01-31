use std::sync::Arc;

use futures_util::SinkExt;
use log::{error, info};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use crate::{Player, WsStream};

struct CasualQueue {
    queue: Arc<Mutex<Vec<Player>>>,
}

impl CasualQueue {
    pub fn new() -> Self {
        Self {
            queue: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn add_in_queue(&mut self, client: Player) {
        let mut queue = self.queue.lock().await;
        if let Some(opponent) = queue.pop() {
            drop(queue);
            if let Err(e) = self.handle_match(client.1, opponent.1).await {
                error!("Failed to handle match: {}", e);
            }
        } else {
            queue.push(client);
        }
    }

    pub async fn remove_from_queue(&mut self, player: Uuid) {
        let mut queue = self.queue.lock().await;
        queue.retain(|p| p.0 == player);
    }

    async fn handle_match(
        &self,
        mut client1: WsStream,
        mut client2: WsStream,
    ) -> anyhow::Result<()> {
        info!("Match found!");
        let msg = Message::Text("It's matched".into());

        client1.send(msg.clone()).await?;
        client1.send(Message::Close(None)).await?;

        client2.send(msg).await?;
        client2.send(Message::Close(None)).await?;

        Ok(())
    }
}
