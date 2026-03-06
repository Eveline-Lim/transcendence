use axum::http::HeaderMap;
use uuid::Uuid;

pub mod messages;
pub mod ws;

fn extract_caller_id(headers: &HeaderMap) -> Option<Uuid> {
    headers
        .get("X-User-Id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}
