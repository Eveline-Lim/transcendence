use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{handlers::extract_caller_id, models::WsTicketResponse, state::AppState};

const TICKET_TTL_SECS: u64 = 10;

/// GET /chat/ticket — issues a short-lived WS connection ticket.
///
/// Requires the API Gateway to have already validated the JWT and forwarded
/// the authenticated user's ID in the `X-User-Id` header.
pub async fn get_ticket(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(user_id) = extract_caller_id(&headers) else {
        return (
            StatusCode::UNAUTHORIZED,
            "Missing or invalid X-User-Id header",
        )
            .into_response();
    };
    let ticket = Uuid::new_v4();
    let expires_at = Instant::now() + Duration::from_secs(TICKET_TTL_SECS);
    state.tickets.insert(ticket, (user_id, expires_at));
    Json(WsTicketResponse {
        ticket,
        expires_in: TICKET_TTL_SECS as u32,
    })
    .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Router, body::Body, http::Request, routing::get};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn build_app(state: Arc<AppState>) -> Router {
        Router::new()
            .route("/chat/ticket", get(get_ticket))
            .with_state(state)
    }

    /// 401 when the X-User-Id header is absent.
    #[tokio::test]
    async fn test_get_ticket_missing_header_returns_unauthorized() {
        let state = Arc::new(AppState::new());
        let app = build_app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/chat/ticket")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    /// 401 when the X-User-Id header contains a non-UUID value.
    #[tokio::test]
    async fn test_get_ticket_invalid_uuid_header_returns_unauthorized() {
        let state = Arc::new(AppState::new());
        let app = build_app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/chat/ticket")
                    .header("X-User-Id", "not-a-uuid")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    /// 200 with a valid ticket body, and the ticket is stored in state.
    #[tokio::test]
    async fn test_get_ticket_returns_ticket_and_stores_it() {
        let state = Arc::new(AppState::new());
        let app = build_app(Arc::clone(&state));

        let user_id = Uuid::new_v4();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/chat/ticket")
                    .header("X-User-Id", user_id.to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let ticket_resp: WsTicketResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(ticket_resp.expires_in, TICKET_TTL_SECS as u32);

        // Ticket must be stored in state and mapped to the correct user.
        assert!(state.tickets.contains_key(&ticket_resp.ticket));
        let (stored_user, _) = *state.tickets.get(&ticket_resp.ticket).unwrap();
        assert_eq!(stored_user, user_id);
    }
}
