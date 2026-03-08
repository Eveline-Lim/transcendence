//! HTTP client for the player service.
//!
//! Single responsibility: fetch player data from the player service REST API.
//! All network I/O, URL construction, JSON parsing, and error handling live
//! here so that domain types (e.g. [`PlayerInfo`]) stay pure data.

use std::env;

use log::warn;
use reqwest::Client;
use uuid::Uuid;

/// Minimal projection of `PlayerStatisticsResponse` returned by the player
/// service.  Only the fields this service actually needs are declared.
#[derive(serde::Deserialize)]
struct PlayerStatisticsResponse {
    #[serde(rename = "eloRating", default)]
    elo_rating: u32,
}

/// Default ELO assigned when the player service is unreachable or returns an
/// error.  Mirrors the player-service default (`eloRating = 1000`).
const DEFAULT_ELO: u32 = 1000;

/// Client for the player-service REST API.
///
/// Wraps a [`reqwest::Client`] (which manages a connection pool internally)
/// together with the resolved base URL so both can be constructed once and
/// shared for the lifetime of the application.
#[derive(Clone)]
pub struct PlayerServiceClient {
    http: Client,
    base_url: String,
}

impl PlayerServiceClient {
    /// Build a client whose base URL is taken from the `PLAYER_SERVICE_URL`
    /// environment variable, falling back to `http://player_service:8080`.
    pub fn from_env() -> Self {
        let base_url = env::var("PLAYER_SERVICE_URL")
            .unwrap_or_else(|_| "http://player_service:8080".to_string());

        Self {
            http: Client::new(),
            base_url: base_url.trim_end_matches('/').to_owned(),
        }
    }

    /// Fetch the ELO rating for `player_id`.
    ///
    /// Returns [`DEFAULT_ELO`] if the request fails or the field is absent so
    /// that ranked matchmaking always has a usable value.
    pub async fn fetch_elo(&self, player_id: Uuid) -> u32 {
        let url = format!("{}/api/v1/players/{}/statistics", self.base_url, player_id);

        match self.http.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<PlayerStatisticsResponse>().await {
                    Ok(stats) => stats.elo_rating,
                    Err(e) => {
                        warn!("failed to parse statistics for {player_id}: {e}");
                        DEFAULT_ELO
                    }
                }
            }
            Ok(resp) => {
                warn!(
                    "player service returned {} for player {player_id}",
                    resp.status()
                );
                DEFAULT_ELO
            }
            Err(e) => {
                warn!("could not reach player service for {player_id}: {e}");
                DEFAULT_ELO
            }
        }
    }
}
