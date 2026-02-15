use crate::messages::ServerMessage;
use tokio::sync::mpsc;
use uuid::Uuid;

/// A player handle stored in a queue.
///
///
/// The `sender` is used to push [`ServerMessage`]s back to the player's
/// WebSocket writer task.  It is cheaply cloneable and never blocks.
#[derive(Debug)]
pub struct WaitingPlayer {
    pub id: Uuid,
    pub username: String,
    pub avatar_url: Option<String>,
    pub sender: mpsc::UnboundedSender<ServerMessage>,
}

impl WaitingPlayer {
    pub async fn get_rank(&self) -> u32 {
        //TODO: à finir (doit attendre le service profile)
        return 1000;
    }
}
