use serde::Deserialize;
use uuid::Uuid;

// ── Response types ────────────────────────────────────────────────────────────

// Matches `GET /players/{userId}/friends/{otherId}` → `{ "areFriends": bool }`
#[derive(Deserialize)]
struct CheckFriendshipResponse {
    #[serde(rename = "areFriends")]
    are_friends: bool,
}

// ── Error type ────────────────────────────────────────────────────────────────

/// Errors that can occur while checking friendship status.
/// Callers should map these to HTTP responses (503 / 502) rather than 403.
#[derive(Debug)]
#[allow(dead_code)] // inner fields are available for logging/inspection by callers
pub enum FriendshipCheckError {
    /// Network / connection error — Player Service unreachable → 503.
    ServiceUnavailable(reqwest::Error),
    /// Player Service returned a non-2xx HTTP status → 502.
    UpstreamError(reqwest::StatusCode),
    /// Player Service returned 2xx but the body could not be parsed → 502.
    ParseError(reqwest::Error),
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Calls `GET {player_service_url}/players/{caller_id}/friends/{other_id}`
/// and returns `Ok(true)` / `Ok(false)` according to the Player Service reply.
///
/// Returns:
/// * `Ok(true)`  — users are friends.
/// * `Ok(false)` — users are not friends (explicit `areFriends: false`).
/// * `Err(FriendshipCheckError::ServiceUnavailable)` — network/connect error.
/// * `Err(FriendshipCheckError::UpstreamError)` — non-2xx HTTP status.
/// * `Err(FriendshipCheckError::ParseError)` — malformed response body.
///
/// Callers must differentiate `Ok(false)` (→ 403) from `Err(_)` (→ 502/503)
/// so that a Player Service outage is not silently treated as "not friends".
pub async fn are_friends(
    client: &reqwest::Client,
    player_service_url: &str,
    caller_id: Uuid,
    other_id: Uuid,
) -> Result<bool, FriendshipCheckError> {
    let url = format!(
        "{}/players/{}/friends/{}",
        player_service_url, caller_id, other_id
    );

    let resp = client
        .get(&url)
        .header("X-User-Id", caller_id.to_string())
        .send()
        .await
        .map_err(FriendshipCheckError::ServiceUnavailable)?;

    if !resp.status().is_success() {
        return Err(FriendshipCheckError::UpstreamError(resp.status()));
    }

    let body = resp
        .json::<CheckFriendshipResponse>()
        .await
        .map_err(FriendshipCheckError::ParseError)?;

    Ok(body.are_friends)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Json, Router, extract::Path, routing::get};

    /// Spin up a mock player service that returns `areFriends: true` for specified pairs.
    async fn start_mock_service(friend_pairs: Vec<(Uuid, Uuid)>) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let app = Router::new().route(
            "/players/{user_id}/friends/{other_id}",
            get(move |Path((user_id, other_id)): Path<(Uuid, Uuid)>| {
                let pairs = friend_pairs.clone();
                async move {
                    let are_friends = pairs.contains(&(user_id, other_id));
                    Json(serde_json::json!({ "areFriends": are_friends }))
                }
            }),
        );

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        format!("http://{}", addr)
    }

    #[tokio::test]
    async fn test_are_friends_returns_true_when_friends() {
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();
        let url = start_mock_service(vec![(user_a, user_b)]).await;

        let client = reqwest::Client::new();
        let result = are_friends(&client, &url, user_a, user_b).await;

        assert!(matches!(result, Ok(true)));
    }

    #[tokio::test]
    async fn test_are_friends_returns_false_when_not_friends() {
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();
        let url = start_mock_service(vec![]).await; // empty list = no friends

        let client = reqwest::Client::new();
        let result = are_friends(&client, &url, user_a, user_b).await;

        assert!(matches!(result, Ok(false)));
    }

    #[tokio::test]
    async fn test_are_friends_returns_err_on_unreachable_service() {
        let client = reqwest::Client::new();
        // Use a port that's not listening
        let result = are_friends(
            &client,
            "http://127.0.0.1:1",
            Uuid::new_v4(),
            Uuid::new_v4(),
        )
        .await;

        assert!(matches!(
            result,
            Err(FriendshipCheckError::ServiceUnavailable(_))
        ));
    }

    #[tokio::test]
    async fn test_are_friends_returns_false_on_malformed_response() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let app = Router::new().route(
            "/players/{user_id}/friends/{other_id}",
            get(|| async { "not json" }),
        );

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let url = format!("http://{}", addr);
        let client = reqwest::Client::new();
        let result = are_friends(&client, &url, Uuid::new_v4(), Uuid::new_v4()).await;

        assert!(matches!(result, Err(FriendshipCheckError::ParseError(_))));
    }
}
