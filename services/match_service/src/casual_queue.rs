use std::collections::VecDeque;

use crate::messages::{QueueUpdateData, ServerMessage};
use crate::waiting_player::WaitingPlayer;
use uuid::Uuid;

/// First-come-first-served matchmaking queue.
///
/// Internally a [`VecDeque`] so the oldest waiting player is always matched
/// first.  Disconnected players (closed sender) are silently skipped.
#[derive(Debug, Default)]
pub struct CasualQueue {
    players: VecDeque<WaitingPlayer>,
}

impl CasualQueue {
    pub fn new() -> Self {
        Self::default()
    }

    /// Number of players currently in the queue.
    pub fn len(&self) -> usize {
        self.players.len()
    }

    pub fn is_empty(&self) -> bool {
        self.players.is_empty()
    }

    /// Add a player.
    ///
    /// Returns `Some((first_in_queue, newcomer))` when a match is formed,
    /// or `None` when the player has been placed in the waiting queue (a
    /// [`ServerMessage::QueueUpdate`] is broadcast to all waiters).
    pub fn enqueue(&mut self, player: WaitingPlayer) -> Option<(WaitingPlayer, WaitingPlayer)> {
        while let Some(opponent) = self.players.pop_front() {
            if !opponent.sender.is_closed() {
                return Some((opponent, player));
            }
        }
        self.players.push_back(player);
        self.broadcast_queue_update();
        None
    }

    /// Remove a specific player from the queue.  Returns `true` if the
    /// player was found and removed.
    pub fn dequeue(&mut self, player_id: Uuid) -> bool {
        let before = self.players.len();
        self.players.retain(|p| p.id != player_id);
        let removed = self.players.len() < before;
        if removed {
            self.broadcast_queue_update();
        }
        removed
    }

    fn broadcast_queue_update(&self) {
        let msg = ServerMessage::QueueUpdate {
            data: QueueUpdateData {
                players_waiting: self.players.len(),
                estimated_wait_time: self.estimated_wait_secs(),
            },
        };
        for p in &self.players {
            let _ = p.sender.send(msg.clone());
        }
    }

    fn estimated_wait_secs(&self) -> u64 {
        if self.players.is_empty() { 0 } else { 10 }
    }
}

#[cfg(test)]
mod tests {
    use tokio::sync::mpsc;

    use crate::waiting_player::PlayerInfo;

    use super::*;

    fn make_player(name: &str) -> (WaitingPlayer, mpsc::UnboundedReceiver<ServerMessage>) {
        let (tx, rx) = mpsc::unbounded_channel();
        let info = PlayerInfo::new(Uuid::new_v4(), name.into(), None);
        (WaitingPlayer::new(info, tx), rx)
    }

    #[test]
    fn single_player_waits() {
        let mut q = CasualQueue::new();
        let (p, _rx) = make_player("alice");
        assert!(q.enqueue(p).is_none());
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn two_players_match_immediately() {
        let mut q = CasualQueue::new();
        let (p1, _rx1) = make_player("alice");
        let (p2, _rx2) = make_player("bob");

        assert!(q.enqueue(p1).is_none());
        let (a, b) = q.enqueue(p2).expect("should match");
        assert_eq!(a.username, "alice");
        assert_eq!(b.username, "bob");
        assert!(q.is_empty());
    }

    #[test]
    fn fifo_order_respected() {
        let mut q = CasualQueue::new();
        let (a, _ra) = make_player("first");
        let (b, _rb) = make_player("second");
        let (c, _rc) = make_player("third");

        assert!(q.enqueue(a).is_none());
        let (m1, m2) = q.enqueue(b).unwrap();
        assert_eq!(m1.username, "first");
        assert_eq!(m2.username, "second");

        assert!(q.enqueue(c).is_none());
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn dequeue_removes_player() {
        let mut q = CasualQueue::new();
        let (p, _rx) = make_player("alice");
        let id = p.id;
        q.enqueue(p);
        assert!(q.dequeue(id));
        assert!(q.is_empty());
    }

    #[test]
    fn dequeue_nonexistent_returns_false() {
        let mut q = CasualQueue::new();
        assert!(!q.dequeue(Uuid::new_v4()));
    }

    #[test]
    fn skips_disconnected_players() {
        let mut q = CasualQueue::new();
        let (p1, rx1) = make_player("disconnected");
        drop(rx1);
        q.enqueue(p1);

        let (p2, _rx2) = make_player("bob");
        assert!(q.enqueue(p2).is_none());
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn broadcast_on_enqueue() {
        let mut q = CasualQueue::new();
        let (p, mut rx) = make_player("alice");
        q.enqueue(p);

        let msg = rx.try_recv().expect("should receive queue update");
        match msg {
            ServerMessage::QueueUpdate { data } => {
                assert_eq!(data.players_waiting, 1);
                assert_eq!(data.estimated_wait_time, 10);
            }
            other => panic!("expected QueueUpdate, got {other:?}"),
        }
    }

    #[test]
    fn no_broadcast_when_match_formed() {
        let mut q = CasualQueue::new();
        let (p1, mut rx1) = make_player("alice");
        let (p2, mut rx2) = make_player("bob");

        q.enqueue(p1);
        let _ = rx1.try_recv();

        assert!(q.enqueue(p2).is_some());
        assert!(rx2.try_recv().is_err(), "p2 should not get a QueueUpdate");
    }

    #[test]
    fn broadcast_after_dequeue_works() {
        let mut q = CasualQueue::new();
        let (p1, rx1) = make_player("alice");
        let id1 = p1.id;

        q.enqueue(p1);
        drop(rx1);

        assert!(q.dequeue(id1));
        assert_eq!(q.len(), 0);
    }

    #[test]
    fn multiple_disconnected_players_cleaned_up() {
        let mut q = CasualQueue::new();

        for i in 0..3 {
            let (p, rx) = make_player(&format!("disconnected-{}", i));
            drop(rx);
            q.enqueue(p);
        }

        let (live, _rx) = make_player("live");
        assert!(q.enqueue(live).is_none());
        assert_eq!(q.len(), 1, "disconnected players should be cleaned up");
    }
}
