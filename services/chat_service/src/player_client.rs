use serde::Deserialize;
use uuid::Uuid;

// ── Response types ────────────────────────────────────────────────────────────

// Matches `GET /players/{userId}/friends/{otherId}` → `{ "areFriends": bool }`
#[derive(Deserialize)]
struct CheckFriendshipResponse {
    #[serde(rename = "areFriends")]
    are_friends: bool,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Calls `GET {player_service_url}/players/{caller_id}/friends/{recipient_id}`
/// and returns the `areFriends` boolean from the Player Service.
///
/// Uses the dedicated friendship-check endpoint (O(1)) rather than fetching
/// and scanning the full friends list.
///
/// Returns `false` on any network or deserialization error — the handler will
/// surface a 403, which callers can retry after verifying the friendship.
pub async fn are_friends(
    client: &reqwest::Client,
    player_service_url: &str,
    caller_id: Uuid,
    other_id: Uuid,
) -> bool {
    let url = format!(
        "{}/players/{}/friends/{}",
        player_service_url, caller_id, other_id
    );

    let result = client
        .get(&url)
        .header("X-User-Id", caller_id.to_string())
        .send()
        .await;

    match result {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<CheckFriendshipResponse>().await {
                Ok(body) => body.are_friends,
                Err(_) => false,
            }
        }
        _ => false,
    }
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

        assert!(result);
    }

    #[tokio::test]
    async fn test_are_friends_returns_false_when_not_friends() {
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();
        let url = start_mock_service(vec![]).await; // empty list = no friends

        let client = reqwest::Client::new();
        let result = are_friends(&client, &url, user_a, user_b).await;

        assert!(!result);
    }

    #[tokio::test]
    async fn test_are_friends_returns_false_on_unreachable_service() {
        let client = reqwest::Client::new();
        // Use a port that's not listening
        let result = are_friends(
            &client,
            "http://127.0.0.1:1",
            Uuid::new_v4(),
            Uuid::new_v4(),
        )
        .await;

        assert!(!result);
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

        assert!(!result);
    }
}
