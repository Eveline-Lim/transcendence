pub mod casual_queue;
pub mod handler;
pub mod messages;
pub mod player_client;
pub mod ranked_queue;
pub mod waiting_player;

use tokio::sync::Mutex;

use casual_queue::CasualQueue;
use player_client::PlayerServiceClient;
use ranked_queue::RankedQueue;

pub struct AppState {
    pub casual: Mutex<CasualQueue>,
    pub ranked: Mutex<RankedQueue>,
    pub player_client: PlayerServiceClient,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            casual: Mutex::new(CasualQueue::new()),
            ranked: Mutex::new(RankedQueue::new()),
            player_client: PlayerServiceClient::from_env(),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
