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
