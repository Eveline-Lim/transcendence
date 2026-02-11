use std::collections::BTreeMap;

use uuid::Uuid;

use crate::casual_queue::WaitingPlayer;
use crate::messages::{QueueUpdateData, ServerMessage};

const MAX_RANK_DIFF: u32 = 50;

/// Rank-based matchmaking queue backed by a [`BTreeMap`] for O(log n) range
/// lookups.  Players are bucketed by MMR and the closest available opponent
/// within [`MAX_RANK_DIFF`] is chosen.
#[derive(Debug, Default)]
pub struct RankedQueue {
    buckets: BTreeMap<u32, Vec<WaitingPlayer>>,
    total: usize,
}

impl RankedQueue {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn len(&self) -> usize {
        self.total
    }

    pub fn is_empty(&self) -> bool {
        self.total == 0
    }

    /// Enqueue a player at the given `mmr`.
    ///
    /// Returns `Some((opponent, newcomer))` if a match was found within
    /// `MAX_RANK_DIFF`, or `None` if the player is now waiting.
    pub fn enqueue(
        &mut self,
        player: WaitingPlayer,
        mmr: u32,
    ) -> Option<(WaitingPlayer, WaitingPlayer)> {
        if let Some(opponent) = self.pop_closest(mmr) {
            return Some((opponent, player));
        }
        self.buckets.entry(mmr).or_default().push(player);
        self.total += 1;
        self.broadcast_queue_update();
        None
    }

    /// Remove a player by id.  Returns `true` if found.
    pub fn dequeue(&mut self, player_id: Uuid) -> bool {
        for players in self.buckets.values_mut() {
            if let Some(pos) = players.iter().position(|p| p.id == player_id) {
                players.swap_remove(pos);
                self.total -= 1;
                self.buckets.retain(|_, v| !v.is_empty());
                self.broadcast_queue_update();
                return true;
            }
        }
        false
    }

    /// Pop the closest-MMR *connected* opponent within the allowed range.
    fn pop_closest(&mut self, mmr: u32) -> Option<WaitingPlayer> {
        let lo = mmr.saturating_sub(MAX_RANK_DIFF);
        let hi = mmr.saturating_add(MAX_RANK_DIFF);

        let mut candidates: Vec<u32> = self
            .buckets
            .range(lo..=hi)
            .filter(|(_, v)| !v.is_empty())
            .map(|(&k, _)| k)
            .collect();
        candidates.sort_by_key(|&k| (k as i64 - mmr as i64).unsigned_abs());

        for target in candidates {
            if let Some(players) = self.buckets.get_mut(&target) {
                if let Some(idx) = players.iter().position(|p| !p.sender.is_closed()) {
                    let opponent = players.swap_remove(idx);
                    self.total -= 1;
                    if players.is_empty() {
                        self.buckets.remove(&target);
                    }
                    return Some(opponent);
                }
            }
        }
        None
    }

    fn broadcast_queue_update(&self) {
        let msg = ServerMessage::QueueUpdate {
            data: QueueUpdateData {
                players_waiting: self.total,
                estimated_wait_time: self.estimated_wait_secs(),
            },
        };
        for players in self.buckets.values() {
            for p in players {
                let _ = p.sender.send(msg.clone());
            }
        }
    }

    fn estimated_wait_secs(&self) -> u64 {
        if self.total == 0 { 0 } else { 15 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    fn make_player(name: &str) -> (WaitingPlayer, mpsc::UnboundedReceiver<ServerMessage>) {
        let (tx, rx) = mpsc::unbounded_channel();
        (
            WaitingPlayer {
                id: Uuid::new_v4(),
                username: name.into(),
                avatar_url: None,
                sender: tx,
            },
            rx,
        )
    }

    #[test]
    fn single_player_waits() {
        let mut q = RankedQueue::new();
        let (p, _rx) = make_player("alice");
        assert!(q.enqueue(p, 1000).is_none());
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn match_within_range() {
        let mut q = RankedQueue::new();
        let (p1, _r1) = make_player("alice");
        let (p2, _r2) = make_player("bob");

        q.enqueue(p1, 1000);
        let (a, b) = q.enqueue(p2, 1030).expect("should match within ±50");
        assert_eq!(a.username, "alice");
        assert_eq!(b.username, "bob");
        assert!(q.is_empty());
    }

    #[test]
    fn no_match_outside_range() {
        let mut q = RankedQueue::new();
        let (p1, _r1) = make_player("alice");
        let (p2, _r2) = make_player("bob");

        q.enqueue(p1, 1000);
        assert!(q.enqueue(p2, 1100).is_none());
        assert_eq!(q.len(), 2);
    }

    #[test]
    fn matches_closest_mmr() {
        let mut q = RankedQueue::new();
        let (far, _r1) = make_player("far");
        let (close, _r2) = make_player("close");

        assert!(q.enqueue(far, 900).is_none());
        assert!(q.enqueue(close, 990).is_none());

        let (joiner, _rj) = make_player("joiner");
        let (matched, _) = q.enqueue(joiner, 1000).expect("should match close");
        assert_eq!(matched.username, "close");
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn exact_boundary_matches() {
        let mut q = RankedQueue::new();
        let (p1, _r1) = make_player("edge");
        let (p2, _r2) = make_player("joiner");

        q.enqueue(p1, 950);
        let m = q.enqueue(p2, 1000);
        assert!(m.is_some(), "±50 boundary should be inclusive");
    }

    #[test]
    fn just_outside_boundary_no_match() {
        let mut q = RankedQueue::new();
        let (p1, _r1) = make_player("edge");
        let (p2, _r2) = make_player("joiner");

        q.enqueue(p1, 949);
        assert!(q.enqueue(p2, 1000).is_none());
    }

    #[test]
    fn dequeue_removes_player() {
        let mut q = RankedQueue::new();
        let (p, _rx) = make_player("alice");
        let id = p.id;
        q.enqueue(p, 1000);
        assert!(q.dequeue(id));
        assert!(q.is_empty());
    }

    #[test]
    fn dequeue_nonexistent() {
        let mut q = RankedQueue::new();
        assert!(!q.dequeue(Uuid::new_v4()));
    }

    #[test]
    fn skips_disconnected_in_ranked() {
        let mut q = RankedQueue::new();
        let (p1, rx1) = make_player("disconnected");
        drop(rx1);
        q.enqueue(p1, 1000);

        let (p2, _r2) = make_player("bob");
        assert!(q.enqueue(p2, 1000).is_none());

        assert_eq!(q.len(), 2, "total includes disconnected player");
    }

    #[test]
    fn skips_multiple_disconnected_players() {
        let mut q = RankedQueue::new();

        for i in 0..3 {
            let (p, rx) = make_player(&format!("disconnected-{}", i));
            drop(rx);
            q.enqueue(p, 1000);
        }

        let (live, _rx) = make_player("live");
        assert!(q.enqueue(live, 1000).is_none());
        assert_eq!(q.len(), 4);
    }

    #[test]
    fn broadcast_on_ranked_enqueue() {
        let mut q = RankedQueue::new();
        let (p, mut rx) = make_player("alice");
        q.enqueue(p, 1000);

        let msg = rx.try_recv().expect("should receive queue update");
        assert!(matches!(msg, ServerMessage::QueueUpdate { .. }));
    }

    #[test]
    fn broadcast_on_ranked_dequeue() {
        let mut q = RankedQueue::new();
        let (p1, _rx1) = make_player("alice");
        let (p2, mut rx2) = make_player("bob");

        let id1 = p1.id;
        q.enqueue(p1, 900);
        q.enqueue(p2, 1000);

        let _ = rx2.try_recv();

        q.dequeue(id1);

        let msg = rx2
            .try_recv()
            .expect("should receive queue update after dequeue");
        match msg {
            ServerMessage::QueueUpdate { data } => {
                assert_eq!(data.players_waiting, 1);
            }
            other => panic!("expected QueueUpdate, got {other:?}"),
        }
    }
}
