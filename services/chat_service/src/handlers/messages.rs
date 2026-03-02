use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode, header},
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    handlers::extract_caller_id,
    models::SendMessageRequest,
    state::{AppState, ChatMessage},
    utils::now_timestamp,
};

/// GET /chat/messages/:user_id — returns in-memory conversation history.
pub async fn get_messages(
    State(state): State<Arc<AppState>>,
    Path(other_id): Path<Uuid>,
    header: HeaderMap,
) -> impl IntoResponse {
    let Some(caller_id) = extract_caller_id(&header) else {
        return (StatusCode::UNAUTHORIZED, Json(Vec::<ChatMessage>::new())).into_response();
    };
    let key = AppState::conv_key(caller_id, other_id);
    let msgs = state
        .messages
        .get(&key)
        .map(|v| v.clone())
        .unwrap_or_default();
    (StatusCode::OK, Json(msgs)).into_response()
}

/// POST /chat/messages — send a message to a friend.
pub async fn send_message(
    State(state): State<Arc<AppState>>,
    Json(body): Json<SendMessageRequest>,
) -> impl IntoResponse {
    // TODO: extract caller identity from X-User-Id header
    let sender_id = Uuid::nil(); // placeholder
    let msg = ChatMessage {
        message_id: Uuid::new_v4(),
        sender_id,
        recipient_id: body.recipient_id,
        content: body.content,
        sent_at: now_timestamp(),
    };

    let key = AppState::conv_key(sender_id, msg.recipient_id);
    state.messages.entry(key).or_default().push(msg.clone());
    let _ = state.tx.send(msg.clone());

    (StatusCode::OK, Json(msg))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Router, body::Body, http::Request, routing::get};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn build_app(state: Arc<AppState>) -> Router {
        Router::new()
            .route("/chat/messages/{user_id}", get(get_messages))
            .with_state(state)
    }

    /// 401 when the X-User-Id header is absent.
    #[tokio::test]
    async fn test_get_messages_missing_header_returns_unauthorized() {
        let state = Arc::new(AppState::new());
        let app = build_app(state);

        let other_id = Uuid::new_v4();
        let response = app
            .oneshot(
                Request::builder()
                    .uri(format!("/chat/messages/{}", other_id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    /// 200 with an empty JSON array when there are no messages for the conversation.
    #[tokio::test]
    async fn test_get_messages_no_history_returns_empty_array() {
        let state = Arc::new(AppState::new());
        let app = build_app(state);

        let caller_id = Uuid::new_v4();
        let other_id = Uuid::new_v4();

        let response = app
            .oneshot(
                Request::builder()
                    .uri(format!("/chat/messages/{}", other_id))
                    .header("X-User-Id", caller_id.to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let msgs: Vec<ChatMessage> = serde_json::from_slice(&body).unwrap();
        assert!(msgs.is_empty());
    }

    /// 200 with the correct messages when conversation history exists.
    #[tokio::test]
    async fn test_get_messages_returns_existing_messages() {
        let state = Arc::new(AppState::new());

        let caller_id = Uuid::new_v4();
        let other_id = Uuid::new_v4();
        let key = AppState::conv_key(caller_id, other_id);

        let expected_msg = ChatMessage {
            message_id: Uuid::new_v4(),
            sender_id: caller_id,
            recipient_id: other_id,
            content: "Hello!".to_string(),
            sent_at: "2026-03-02T00:00:00Z".to_string(),
        };
        state.messages.entry(key).or_default().push(expected_msg.clone());

        let app = build_app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri(format!("/chat/messages/{}", other_id))
                    .header("X-User-Id", caller_id.to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let msgs: Vec<ChatMessage> = serde_json::from_slice(&body).unwrap();
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].message_id, expected_msg.message_id);
        assert_eq!(msgs[0].sender_id, caller_id);
        assert_eq!(msgs[0].content, "Hello!");
    }
}
