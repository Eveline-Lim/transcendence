use chrono::Utc;

/// Returns the current time as an ISO 8601 timestamp (RFC 3339).
pub fn now_timestamp() -> String {
    Utc::now().to_rfc3339()
}
