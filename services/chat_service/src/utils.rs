/// Returns a simple Unix timestamp string.
/// TODO: replace with a proper ISO 8601 timestamp using the `chrono` crate.
pub fn now_timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_default()
}
