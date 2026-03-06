use axum::http::HeaderMap;
use uuid::Uuid;

pub mod messages;
pub mod ticket;
pub mod ws;

struct User {
    id: Uuid,
    username: String,
}

fn extract_caller_id(headers: &HeaderMap) -> Option<Uuid> {
    headers
        .get("X-User-Id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

fn get_user_from_request(headers: &HeaderMap) -> Option<User> {
    let id = extract_caller_id(&headers);
    let username = headers.get("X-Username").and_then(|v| v.to_str().ok());

    if let Some(id) = id
        && let Some(username) = username
    {
        Some(User {
            id,
            username: username.to_string(),
        })
    } else {
        None
    }
}
