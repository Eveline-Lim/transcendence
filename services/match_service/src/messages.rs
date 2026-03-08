use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum GameMode {
    #[default]
    Casual,
    Ranked,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "event")]
pub enum ClientMessage {
    #[serde(rename = "join_queue")]
    JoinQueue {
        #[serde(default)]
        data: Option<JoinQueueData>,
    },
    #[serde(rename = "leave_queue")]
    LeaveQueue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinQueueData {
    #[serde(default)]
    pub game_mode: GameMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "event")]
pub enum ServerMessage {
    #[serde(rename = "queue_update")]
    QueueUpdate { data: QueueUpdateData },
    #[serde(rename = "match_found")]
    MatchFound { data: MatchFoundData },
    #[serde(rename = "matchmaking_error")]
    MatchmakingError { data: MatchmakingErrorData },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QueueUpdateData {
    pub players_waiting: usize,
    pub estimated_wait_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MatchFoundData {
    pub match_id: Uuid,
    pub game_engine_url: String,
    pub opponent: OpponentInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpponentInfo {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MatchmakingErrorData {
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_join_queue_casual() {
        let json = r#"{"event":"join_queue","data":{"gameMode":"casual"}}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        match msg {
            ClientMessage::JoinQueue { data: Some(d) } => {
                assert_eq!(d.game_mode, GameMode::Casual);
            }
            _ => panic!("expected JoinQueue with casual data"),
        }
    }

    #[test]
    fn deserialize_join_queue_ranked() {
        let json = r#"{"event":"join_queue","data":{"gameMode":"ranked"}}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        match msg {
            ClientMessage::JoinQueue { data: Some(d) } => {
                assert_eq!(d.game_mode, GameMode::Ranked);
            }
            _ => panic!("expected JoinQueue with ranked data"),
        }
    }

    #[test]
    fn deserialize_join_queue_without_data_defaults_to_none() {
        let json = r#"{"event":"join_queue"}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        match msg {
            ClientMessage::JoinQueue { data: None } => {}
            _ => panic!("expected JoinQueue with no data"),
        }
    }

    #[test]
    fn deserialize_join_queue_empty_data_defaults_game_mode() {
        let json = r#"{"event":"join_queue","data":{}}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        match msg {
            ClientMessage::JoinQueue { data: Some(d) } => {
                assert_eq!(d.game_mode, GameMode::Casual);
            }
            _ => panic!("expected JoinQueue with default game mode"),
        }
    }

    #[test]
    fn deserialize_leave_queue() {
        let json = r#"{"event":"leave_queue"}"#;
        let msg: ClientMessage = serde_json::from_str(json).unwrap();
        assert!(matches!(msg, ClientMessage::LeaveQueue));
    }

    #[test]
    fn deserialize_unknown_event_fails() {
        let json = r#"{"event":"explode"}"#;
        assert!(serde_json::from_str::<ClientMessage>(json).is_err());
    }

    #[test]
    fn serialize_queue_update() {
        let msg = ServerMessage::QueueUpdate {
            data: QueueUpdateData {
                players_waiting: 3,
                estimated_wait_time: 15,
            },
        };
        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["event"], "queue_update");
        assert_eq!(json["data"]["playersWaiting"], 3);
        assert_eq!(json["data"]["estimatedWaitTime"], 15);
    }

    #[test]
    fn serialize_match_found() {
        let id = Uuid::new_v4();
        let msg = ServerMessage::MatchFound {
            data: MatchFoundData {
                match_id: id,
                game_engine_url: "ws://localhost:9090/game/abc".into(),
                opponent: OpponentInfo {
                    username: "alice".into(),
                    avatar_url: Some("https://example.com/alice.png".into()),
                },
            },
        };
        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["event"], "match_found");
        assert_eq!(json["data"]["matchId"], id.to_string());
        assert_eq!(
            json["data"]["gameEngineUrl"],
            "ws://localhost:9090/game/abc"
        );
        assert_eq!(json["data"]["opponent"]["username"], "alice");
        assert_eq!(
            json["data"]["opponent"]["avatarUrl"],
            "https://example.com/alice.png"
        );
    }

    #[test]
    fn serialize_match_found_omits_null_avatar() {
        let msg = ServerMessage::MatchFound {
            data: MatchFoundData {
                match_id: Uuid::new_v4(),
                game_engine_url: "ws://localhost:9090/game/x".into(),
                opponent: OpponentInfo {
                    username: "bob".into(),
                    avatar_url: None,
                },
            },
        };
        let json = serde_json::to_value(&msg).unwrap();
        assert!(json["data"]["opponent"].get("avatarUrl").is_none());
    }

    #[test]
    fn roundtrip_queue_update() {
        let original = ServerMessage::QueueUpdate {
            data: QueueUpdateData {
                players_waiting: 7,
                estimated_wait_time: 42,
            },
        };
        let json_str = serde_json::to_string(&original).unwrap();
        let restored: ServerMessage = serde_json::from_str(&json_str).unwrap();
        assert_eq!(original, restored);
    }

    #[test]
    fn roundtrip_match_found() {
        let original = ServerMessage::MatchFound {
            data: MatchFoundData {
                match_id: Uuid::new_v4(),
                game_engine_url: "ws://host/game/1".into(),
                opponent: OpponentInfo {
                    username: "eve".into(),
                    avatar_url: Some("https://img.test/eve.jpg".into()),
                },
            },
        };
        let json_str = serde_json::to_string(&original).unwrap();
        let restored: ServerMessage = serde_json::from_str(&json_str).unwrap();
        assert_eq!(original, restored);
    }
}
