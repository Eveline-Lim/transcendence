use serde::{Deserialize, Serialize};

/// JWT Claims structure expected from API Gateway.
///
/// The API Gateway validates JWTs and extracts these claims,
/// passing them to the service via HTTP headers.
#[derive(Debug, Deserialize, Serialize)]
pub struct Claims {
    pub sub: String, // player_id (UUID)
    pub username: String,
    #[serde(default)]
    pub avatar_url: Option<String>,
    pub exp: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claims_deserialization() {
        let json = r#"{
            "sub": "123e4567-e89b-12d3-a456-426614174000",
            "username": "alice",
            "avatar_url": "https://example.com/alice.jpg",
            "exp": 1893456000
        }"#;

        let claims: Claims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "123e4567-e89b-12d3-a456-426614174000");
        assert_eq!(claims.username, "alice");
        assert_eq!(
            claims.avatar_url,
            Some("https://example.com/alice.jpg".to_string())
        );
    }

    #[test]
    fn claims_deserialization_without_avatar() {
        let json = r#"{
            "sub": "123e4567-e89b-12d3-a456-426614174000",
            "username": "bob",
            "exp": 1893456000
        }"#;

        let claims: Claims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.username, "bob");
        assert_eq!(claims.avatar_url, None);
    }
}
