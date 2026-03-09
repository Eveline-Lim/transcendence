//! HTTP client for the game service.
//!
//! Single responsibility: create game sessions via the game-service REST API.
//! All network I/O, URL construction, JSON parsing, and error handling live
//! here so that `handler` is not concerned with those details.

use std::env;
use std::future::Future;
use std::pin::Pin;

use log::{error, warn};
use reqwest::Client;
use serde::Serialize;
use uuid::Uuid;

use crate::messages::GameMode;

/// A successfully created game session.
pub struct CreatedGame {
    /// Opaque identifier used by the game service to store state.
    pub game_id: String,
    /// URL sent to both clients so they know where to connect.
    pub engine_url: String,
}

/// Abstraction over game-session creation.
///
/// The real implementation calls the game-service REST API; test
/// implementations can return canned values without any network I/O.
pub trait GameSessionCreator: Send + Sync {
    fn create_game<'a>(
        &'a self,
        player1_id: Uuid,
        player2_id: Uuid,
        game_mode: GameMode,
    ) -> Pin<Box<dyn Future<Output = Result<CreatedGame, String>> + Send + 'a>>;
}

// ── Request / response DTOs (private to this module) ─────────────────────────

#[derive(Serialize)]
struct CreateGameRequest<'a> {
    player1_id: &'a str,
    player2_id: &'a str,
    game_mode: &'a str,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateGameResponse {
    game_id: String,
}

// ── Production implementation ─────────────────────────────────────────────────

/// HTTP client for the game-service REST API.
///
/// Wraps a [`reqwest::Client`] (connection pool) together with:
/// - `internal_url` – used for service-to-service API calls
///   (e.g. `http://game_service:3001`).
/// - `public_url` – returned to matched players as the Socket.IO origin
///   (e.g. `https://myapp.com`).  Both are read from environment variables
///   at construction time.
#[derive(Clone)]
pub struct GameServiceClient {
    http: Client,
    internal_url: String,
    public_url: String,
}

impl GameServiceClient {
    /// Build a client from environment variables:
    /// - `GAME_SERVICE_URL`  – internal base URL (default: `http://game_service:3001`)
    /// - `GAME_PUBLIC_URL`   – public-facing origin sent to clients
    ///   (default: same as `GAME_SERVICE_URL`)
    pub fn from_env() -> Self {
        let internal_url =
            env::var("GAME_SERVICE_URL").unwrap_or_else(|_| "http://game_service:3001".to_string());

        let public_url = env::var("GAME_PUBLIC_URL").unwrap_or_else(|_| internal_url.clone());

        Self {
            http: Client::new(),
            internal_url: internal_url.trim_end_matches('/').to_owned(),
            public_url: public_url.trim_end_matches('/').to_owned(),
        }
    }
}

impl GameSessionCreator for GameServiceClient {
    fn create_game<'a>(
        &'a self,
        player1_id: Uuid,
        player2_id: Uuid,
        game_mode: GameMode,
    ) -> Pin<Box<dyn Future<Output = Result<CreatedGame, String>> + Send + 'a>> {
        Box::pin(async move {
            let url = format!("{}/api/create-game", self.internal_url);
            let p1 = player1_id.to_string();
            let p2 = player2_id.to_string();
            let mode_str = match game_mode {
                GameMode::Casual => "casual",
                GameMode::Ranked => "ranked",
            };

            let resp = self
                .http
                .post(&url)
                // Internal call: identify as player1 so the game service auth check passes.
                .header("X-User-Id", &p1)
                .json(&CreateGameRequest {
                    player1_id: &p1,
                    player2_id: &p2,
                    game_mode: mode_str,
                })
                .send()
                .await
                .map_err(|e| {
                    error!("could not reach game service: {e}");
                    format!("game service unreachable: {e}")
                })?;

            if !resp.status().is_success() {
                let status = resp.status();
                warn!("game service returned {status} for create-game ({p1} vs {p2})");
                return Err(format!("game service error: {status}"));
            }

            let body: CreateGameResponse = resp.json().await.map_err(|e| {
                error!("failed to parse create-game response: {e}");
                format!("invalid response from game service: {e}")
            })?;

            Ok(CreatedGame {
                game_id: body.game_id,
                engine_url: format!("{}/socket.io/", self.public_url),
            })
        })
    }
}

// ── Test stub ─────────────────────────────────────────────────────────────────

/// A fake game-session creator that returns a synthetic URL immediately,
/// with no network I/O.  Designed to be used in unit / integration tests:
///
/// ```rust,ignore
/// use std::sync::Arc;
/// use match_service::{AppState, game_client::FakeGameClient};
///
/// let state = AppState::with_game_client(Arc::new(FakeGameClient));
/// ```
pub struct FakeGameClient;

impl GameSessionCreator for FakeGameClient {
    fn create_game<'a>(
        &'a self,
        player1_id: Uuid,
        player2_id: Uuid,
        _game_mode: GameMode,
    ) -> Pin<Box<dyn Future<Output = Result<CreatedGame, String>> + Send + 'a>> {
        Box::pin(async move {
            Ok(CreatedGame {
                game_id: format!("test_game_{player1_id}_{player2_id}"),
                engine_url: "ws://localhost:3001/socket.io/".to_string(),
            })
        })
    }
}
