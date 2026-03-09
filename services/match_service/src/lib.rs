pub mod casual_queue;
pub mod game_client;
pub mod handler;
pub mod messages;
pub mod player_client;
pub mod ranked_queue;
pub mod waiting_player;

use std::sync::Arc;

use tokio::sync::Mutex;

use casual_queue::CasualQueue;
use game_client::{GameServiceClient, GameSessionCreator};
use player_client::PlayerServiceClient;
use ranked_queue::RankedQueue;

pub struct AppState {
    pub casual: Mutex<CasualQueue>,
    pub ranked: Mutex<RankedQueue>,
    pub player_client: PlayerServiceClient,
    pub game_client: Arc<dyn GameSessionCreator>,
}

impl AppState {
    pub fn new() -> Self {
        Self::with_game_client(Arc::new(GameServiceClient::from_env()))
    }

    /// Build an `AppState` with an explicit game-session creator.
    /// Pass a [`FakeGameClient`](game_client::FakeGameClient) (or any
    /// `GameSessionCreator` impl) to avoid real HTTP calls in tests.
    pub fn with_game_client(game_client: Arc<dyn GameSessionCreator>) -> Self {
        Self {
            casual: Mutex::new(CasualQueue::new()),
            ranked: Mutex::new(RankedQueue::new()),
            player_client: PlayerServiceClient::from_env(),
            game_client,
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
