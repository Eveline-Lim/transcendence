use std::sync::Arc;

use tokio::sync::Mutex;

use crate::WsStream;

struct CasualQueue {
    queue: Arc<Mutex<Vec<WsStream>>>,
}

impl CasualQueue {
    async fn add(&mut self, client: WsStream) {
        let mut queue = self.queue.lock().await;
        if queue.is_empty() {
            queue.push(client);
            drop(queue);
        } else {
            let mut oponent = queue.pop().unwrap();
            self.handle_match(client, oponent);
        }
    }

    async fn handle_match(&self, client1: WsStream, client2: WsStream) {}
}
