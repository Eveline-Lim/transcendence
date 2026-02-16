pub mod casual_queue;
pub mod handler;
pub mod messages;
pub mod ranked_queue;
pub mod waiting_player;

use tokio::sync::Mutex;

use casual_queue::CasualQueue;
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

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
