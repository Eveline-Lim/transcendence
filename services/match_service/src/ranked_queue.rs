use std::{collections::BTreeMap, sync::Arc};

use futures_util::SinkExt;
use futures_util::StreamExt;
use log::{error, info};
use tokio::sync::{Mutex, MutexGuard};
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use crate::{Player, WsStream};

const MAX_DIFF: u32 = 50;

struct RankedQueue {
    queue: Arc<Mutex<BTreeMap<u32, Vec<Player>>>>,
}

impl RankedQueue {
    pub fn new() -> Self {
        Self {
            queue: Arc::new(Mutex::new(BTreeMap::new())),
        }
    }

    pub async fn handle_socket(&self, client: Player, player_rank: u32) {
        let queue = self.queue.clone();
        
        tokio::spawn(async move {
            Self::add_in_queue_with_disconnect(queue, client, player_rank).await;
        });
    }

    async fn add_in_queue_with_disconnect(
        queue: Arc<Mutex<BTreeMap<u32, Vec<Player>>>>,
        client: Player,
        player_rank: u32,
    ) {
        let uuid = client.0;
        let (mut write, mut read) = client.1.split();

        {
            let mut queue_guard = queue.lock().await;
            if let Some(opponent) = Self::pop_matched_ranked_static(player_rank, &mut queue_guard) {
                drop(queue_guard);
                let client_stream = write.reunite(read).expect("Failed to reunite stream");
                if let Err(e) = Self::handle_match_static(client_stream, opponent.1).await {
                    error!("Failed to handle match: {}", e);
                }
                return;
            } else {
                let client_stream = write.reunite(read).expect("Failed to reunite stream");
                queue_guard
                    .entry(player_rank)
                    .or_insert(Vec::new())
                    .push((uuid, client_stream));
            }
        }
    }

    fn pop_matched_ranked_static(
        rank: u32,
        queue: &mut MutexGuard<'_, BTreeMap<u32, Vec<Player>>>,
    ) -> Option<Player> {
        if let Some((&opponent_rank, list)) = queue
            .range_mut((rank.saturating_sub(MAX_DIFF))..=(rank.saturating_add(MAX_DIFF)))
            .next()
        {
            let res = list.pop();
            if list.is_empty() {
                queue.remove(&opponent_rank);
            }
            res
        } else {
            None
        }
    }

    async fn handle_match_static(
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
