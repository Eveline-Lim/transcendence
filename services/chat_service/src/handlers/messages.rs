use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    handlers::extract_caller_id,
    models::{MessageHistory, MessageQuery, SendMessageRequest},
    player_client::{self, FriendshipCheckError},
    state::{AppState, ChatMessage},
    utils::now_timestamp,
};
use validator::Validate;

/// GET /chat/messages/:user_id — returns paginated conversation history.
///
/// Query parameters:
/// - `limit`  (default 50, max 200): maximum number of messages to return.
/// - `offset` (default 0): number of messages to skip from the start.
pub async fn get_messages(
    State(state): State<Arc<AppState>>,
    Path(other_id): Path<Uuid>,
    Query(pagination): Query<MessageQuery>,
    header: HeaderMap,
) -> impl IntoResponse {
    let Some(caller_id) = extract_caller_id(&header) else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"code": "UNAUTHORIZED", "message": "Missing or invalid X-User-Id header"})),
        )
            .into_response();
    };
    let key = AppState::conv_key(caller_id, other_id);
    let all_msgs = state
        .messages
        .get(&key)
        .map(|v| v.clone())
        .unwrap_or_default();
    let total = all_msgs.len();
    let limit = pagination.limit.min(200);
    let messages = all_msgs
        .into_iter()
        .skip(pagination.offset)
        .take(limit)
        .collect::<Vec<_>>();
    (StatusCode::OK, Json(MessageHistory { messages, total })).into_response()
}

/// POST /chat/messages — send a message to a friend.
pub async fn send_message(
    State(state): State<Arc<AppState>>,
    header: HeaderMap,
    payload: Result<Json<SendMessageRequest>, JsonRejection>,
) -> impl IntoResponse {
    let Json(body) = match payload {
        Ok(json) => json,
        Err(rejection) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "code": "INVALID_PAYLOAD",
                    "message": rejection.body_text()
                })),
            )
                .into_response();
        }
    };
    let Some(sender_id) = extract_caller_id(&header) else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"code": "UNAUTHORIZED", "message": "Missing or invalid X-User-Id header"})),
        )
            .into_response();
    };

    // Trim whitespace then validate via schema rules declared on SendMessageRequest.
    let content = body.content.trim().to_string();
    let body = SendMessageRequest {
        content: content.clone(),
        ..body
    };
    if let Err(errors) = body.validate() {
        let messages: Vec<String> = errors
            .field_errors()
            .values()
            .flat_map(|errs| {
                errs.iter()
                    .map(|e| e.message.as_deref().unwrap_or("invalid").to_string())
            })
            .collect();
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "code": "INVALID_PAYLOAD",
                "message": messages.join("; ")
            })),
        )
            .into_response();
    }

    match player_client::are_friends(
        &state.http_client,
        &state.player_service_url,
        sender_id,
        body.recipient_id,
    )
    .await
    {
        Err(FriendshipCheckError::ServiceUnavailable(_)) => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Player service is temporarily unavailable"
                })),
            )
                .into_response();
        }
        Err(FriendshipCheckError::UpstreamError(status)) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({
                    "code": "BAD_GATEWAY",
                    "message": format!("Player service returned an unexpected status: {}", status)
                })),
            )
                .into_response();
        }
        Err(FriendshipCheckError::ParseError(e)) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({
                    "code": "BAD_GATEWAY",
                    "message": format!("Player service returned an unreadable response: {}", e)
                })),
            )
                .into_response();
        }
        Ok(false) => {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "code": "NOT_FRIENDS",
                    "message": "You can only send messages to friends"
                })),
            )
                .into_response();
        }
        Ok(true) => {}
    }

    let msg = ChatMessage {
        message_id: Uuid::new_v4(),
        sender_id,
        recipient_id: body.recipient_id,
        content,
        sent_at: now_timestamp(),
    };

    let key = AppState::conv_key(sender_id, msg.recipient_id);
    state.messages.entry(key).or_default().push(msg.clone());

    if let Some(tx) = state.ws_senders.get(&msg.recipient_id) {
        let _ = tx.send(msg.clone()).await;
    }

    (StatusCode::OK, Json(msg)).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{MAX_CONTENT_LEN, MessageHistory};
    use axum::{
        Router,
        body::Body,
        http::Request,
        routing::{get, post},
    };
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn build_app(state: Arc<AppState>) -> Router {
        Router::new()
            .route("/chat/messages/{user_id}", get(get_messages))
            .route("/chat/messages", post(send_message))
            .with_state(state)
    }

    // ── Mock player service ───────────────────────────────────────────────────

    /// Spins up a minimal axum server that responds to
    /// `GET /players/:user_id/friends/:other_id` → `{ "areFriends": bool }`
    /// mirroring the Player Service `checkFriendship` endpoint.
    /// `friend_ids` is the set of UUIDs considered friends of any caller.
    async fn start_mock_player_service(friend_ids: Vec<Uuid>) -> String {
        use axum::{extract::Path as AxumPath, routing::get as axum_get};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let app =
            axum::Router::new().route(
                "/players/{user_id}/friends/{other_id}",
                axum_get(move |AxumPath((_, other_id)): AxumPath<(Uuid, Uuid)>| {
                    let ids = friend_ids.clone();
                    async move {
                        axum::Json(serde_json::json!({ "areFriends": ids.contains(&other_id) }))
                    }
                }),
            );

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        format!("http://{}", addr)
    }

    // ── GET /chat/messages/:user_id tests ─────────────────────────────────────

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

    /// 200 with an empty messages/total wrapper when there are no messages.
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
        let history: MessageHistory = serde_json::from_slice(&body).unwrap();
        assert!(history.messages.is_empty());
        assert_eq!(history.total, 0);
    }

    /// 200 with the correct messages and total when conversation history exists.
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
        state
            .messages
            .entry(key)
            .or_default()
            .push(expected_msg.clone());

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
        let history: MessageHistory = serde_json::from_slice(&body).unwrap();
        assert_eq!(history.total, 1);
        assert_eq!(history.messages.len(), 1);
        assert_eq!(history.messages[0].message_id, expected_msg.message_id);
        assert_eq!(history.messages[0].sender_id, caller_id);
        assert_eq!(history.messages[0].content, "Hello!");
    }

    // ── POST /chat/messages tests ─────────────────────────────────────────────

    /// 401 when the X-User-Id header is absent.
    #[tokio::test]
    async fn test_send_message_missing_header_returns_unauthorized() {
        let mock_url = start_mock_player_service(vec![]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(state);

        let recipient_id = Uuid::new_v4();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": "Hi"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    /// 403 when the recipient is not in the caller's friends list.
    #[tokio::test]
    async fn test_send_message_to_non_friend_returns_forbidden() {
        let mock_url = start_mock_player_service(vec![]).await; // empty friends list
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(state);

        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": "Hi"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    /// 200 when the recipient is a friend; message is persisted and returned.
    #[tokio::test]
    async fn test_send_message_to_friend_returns_ok_and_persists() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(Arc::clone(&state));

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": "Hello friend!"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let msg: ChatMessage = serde_json::from_slice(&body).unwrap();
        assert_eq!(msg.sender_id, sender_id);
        assert_eq!(msg.recipient_id, recipient_id);
        assert_eq!(msg.content, "Hello friend!");

        // Message must be persisted in the in-memory store.
        let key = AppState::conv_key(sender_id, recipient_id);
        assert_eq!(state.messages.get(&key).unwrap().len(), 1);
    }

    // ── Content validation tests ───────────────────────────────────────────

    /// 400 when the message content is empty.
    #[tokio::test]
    async fn test_send_message_empty_content_returns_bad_request() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": ""
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    /// 400 when the message content is only whitespace.
    #[tokio::test]
    async fn test_send_message_whitespace_only_returns_bad_request() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": "   \n\t  "
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    /// 400 when the message content exceeds max length.
    #[tokio::test]
    async fn test_send_message_too_long_returns_bad_request() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(state);

        let too_long = "x".repeat(MAX_CONTENT_LEN as usize + 1);
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": too_long
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    /// Message content is trimmed before storage.
    #[tokio::test]
    async fn test_send_message_trims_whitespace() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        let app = build_app(Arc::clone(&state));

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": "  hello world  "
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let msg: ChatMessage = serde_json::from_slice(&body).unwrap();
        assert_eq!(msg.content, "hello world");
    }

    // ── WS delivery tests ──────────────────────────────────────────────────

    /// POST /chat/messages pushes the message to the recipient's mpsc inbox
    /// when they have an open WebSocket connection.
    #[tokio::test]
    async fn test_send_message_delivers_to_online_recipient() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));

        // Simulate a connected recipient by injecting an mpsc sender directly.
        let (tx, mut rx) = tokio::sync::mpsc::channel::<ChatMessage>(8);
        state.ws_senders.insert(recipient_id, tx);

        let app = build_app(Arc::clone(&state));
        app.oneshot(
            Request::builder()
                .method("POST")
                .uri("/chat/messages")
                .header("Content-Type", "application/json")
                .header("X-User-Id", sender_id.to_string())
                .body(Body::from(
                    serde_json::json!({
                        "recipientId": recipient_id,
                        "content": "Hey, you online?"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

        // The message must arrive in the recipient's inbox immediately.
        let delivered = rx
            .try_recv()
            .expect("recipient inbox should have received the message");
        assert_eq!(delivered.sender_id, sender_id);
        assert_eq!(delivered.recipient_id, recipient_id);
        assert_eq!(delivered.content, "Hey, you online?");
    }

    /// When the recipient has no open WebSocket the request still returns 200
    /// and the message is persisted for later retrieval via GET.
    #[tokio::test]
    async fn test_send_message_no_ws_delivery_when_recipient_offline() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));
        // No entry in ws_senders for recipient — they are offline.

        let app = build_app(Arc::clone(&state));
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/chat/messages")
                    .header("Content-Type", "application/json")
                    .header("X-User-Id", sender_id.to_string())
                    .body(Body::from(
                        serde_json::json!({
                            "recipientId": recipient_id,
                            "content": "Are you there?"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        // A missing WS inbox is not an error.
        assert_eq!(response.status(), StatusCode::OK);
        // Message must be persisted for later retrieval.
        let key = AppState::conv_key(sender_id, recipient_id);
        assert_eq!(state.messages.get(&key).unwrap().len(), 1);
    }

    /// A message addressed to user A must NOT be delivered to user B's inbox.
    #[tokio::test]
    async fn test_send_message_does_not_deliver_to_bystander() {
        let sender_id = Uuid::new_v4();
        let recipient_id = Uuid::new_v4();
        let bystander_id = Uuid::new_v4();

        let mock_url = start_mock_player_service(vec![recipient_id]).await;
        let state = Arc::new(AppState::new_with_player_service_url(mock_url));

        let (tx_recipient, mut rx_recipient) = tokio::sync::mpsc::channel::<ChatMessage>(8);
        let (tx_bystander, mut rx_bystander) = tokio::sync::mpsc::channel::<ChatMessage>(8);
        state.ws_senders.insert(recipient_id, tx_recipient);
        state.ws_senders.insert(bystander_id, tx_bystander);

        let app = build_app(Arc::clone(&state));
        app.oneshot(
            Request::builder()
                .method("POST")
                .uri("/chat/messages")
                .header("Content-Type", "application/json")
                .header("X-User-Id", sender_id.to_string())
                .body(Body::from(
                    serde_json::json!({
                        "recipientId": recipient_id,
                        "content": "Private message"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

        // Recipient received the message.
        assert!(
            rx_recipient.try_recv().is_ok(),
            "recipient should have received the message"
        );
        // Bystander did not.
        assert!(
            rx_bystander.try_recv().is_err(),
            "bystander must not receive a message addressed to someone else"
        );
    }
}
