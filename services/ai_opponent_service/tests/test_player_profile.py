"""Tests for engine/player_profile.py"""

import pytest
from unittest.mock import MagicMock

from engine.player_profile import PlayerProfile, PlayerProfileStore


class TestPlayerProfile:
    def test_default_values(self):
        p = PlayerProfile()
        assert p.matches_played == 0
        assert p.avg_paddle_y_ratio == 0.5
        assert p.top_zone_hits == 0
        assert p.center_zone_hits == 0
        assert p.bottom_zone_hits == 0

    def test_preferred_zone_top(self):
        p = PlayerProfile(top_zone_hits=10, center_zone_hits=2, bottom_zone_hits=1)
        assert p.preferred_zone == "top"

    def test_preferred_zone_center(self):
        p = PlayerProfile(top_zone_hits=2, center_zone_hits=10, bottom_zone_hits=3)
        assert p.preferred_zone == "center"

    def test_preferred_zone_bottom(self):
        p = PlayerProfile(top_zone_hits=1, center_zone_hits=2, bottom_zone_hits=10)
        assert p.preferred_zone == "bottom"

    def test_bias_offset_zero_when_not_enough_data(self):
        # total < 5 → no bias
        p = PlayerProfile(top_zone_hits=2, center_zone_hits=1, bottom_zone_hits=1)
        assert p.bias_offset == 0.0

    def test_bias_offset_positive_when_bottom_heavy(self):
        # More bottom hits → positive offset (bot ratio > top ratio)
        p = PlayerProfile(top_zone_hits=1, center_zone_hits=4, bottom_zone_hits=10)
        assert p.bias_offset > 0.0

    def test_bias_offset_negative_when_top_heavy(self):
        p = PlayerProfile(top_zone_hits=10, center_zone_hits=4, bottom_zone_hits=1)
        assert p.bias_offset < 0.0

    def test_bias_offset_zero_when_balanced(self):
        p = PlayerProfile(top_zone_hits=5, center_zone_hits=5, bottom_zone_hits=5)
        assert p.bias_offset == pytest.approx(0.0)


class TestPlayerProfileStore:
    def test_get_profile_creates_new_for_unknown_player(self):
        store = PlayerProfileStore()
        profile = store.get_profile("player_1")
        assert isinstance(profile, PlayerProfile)

    def test_get_profile_returns_same_instance(self):
        store = PlayerProfileStore()
        p1 = store.get_profile("player_1")
        p2 = store.get_profile("player_1")
        assert p1 is p2

    def test_different_players_get_different_profiles(self):
        store = PlayerProfileStore()
        p1 = store.get_profile("alice")
        p2 = store.get_profile("bob")
        assert p1 is not p2

    def test_analyze_match_empty_history_returns_zero(self):
        store = PlayerProfileStore()
        lr = store.analyze_match("player_1", [], 600.0)
        assert lr == 0.0

    def test_analyze_match_invalid_arena_height_returns_zero(self):
        state = MagicMock()
        store = PlayerProfileStore()
        lr = store.analyze_match("player_1", [state], 0.0)
        assert lr == 0.0

    def test_analyze_match_increments_matches_played(self):
        store = PlayerProfileStore()
        state = _make_state(paddle_y=300.0, ball_y=300.0, ball_vx=5.0)
        store.analyze_match("player_1", [state] * 3, 600.0)
        profile = store.get_profile("player_1")
        assert profile.matches_played == 1

    def test_analyze_match_new_player_uses_fast_learning_rate(self):
        store = PlayerProfileStore()
        state = _make_state(paddle_y=300.0, ball_y=300.0, ball_vx=5.0)
        lr = store.analyze_match("player_1", [state], 600.0)
        assert lr == pytest.approx(0.3)

    def test_analyze_match_experienced_player_uses_slow_learning_rate(self):
        store = PlayerProfileStore()
        profile = store.get_profile("veteran")
        profile.matches_played = 5  # already has 5 matches
        state = _make_state(paddle_y=300.0, ball_y=300.0, ball_vx=5.0)
        lr = store.analyze_match("veteran", [state], 600.0)
        assert lr == pytest.approx(0.15)

    def test_analyze_match_counts_ball_zones(self):
        store = PlayerProfileStore()
        # Three balls in bottom third (y > 400 for arena_height=600)
        states = [_make_state(paddle_y=300.0, ball_y=500.0, ball_vx=5.0) for _ in range(3)]
        store.analyze_match("player_1", states, 600.0)
        profile = store.get_profile("player_1")
        assert profile.bottom_zone_hits == 3
        assert profile.top_zone_hits == 0

    def test_analyze_match_ignores_ball_moving_away(self):
        store = PlayerProfileStore()
        # ball_vx < 0 → moving away from AI → should not count zones
        states = [_make_state(paddle_y=300.0, ball_y=500.0, ball_vx=-5.0) for _ in range(3)]
        store.analyze_match("player_1", states, 600.0)
        profile = store.get_profile("player_1")
        assert profile.bottom_zone_hits == 0

    def test_avg_paddle_y_ratio_updated(self):
        store = PlayerProfileStore()
        # paddle always at top (y=0) → avg ratio should decrease from 0.5
        states = [_make_state(paddle_y=0.0, ball_y=300.0, ball_vx=5.0) for _ in range(5)]
        store.analyze_match("player_1", states, 600.0)
        profile = store.get_profile("player_1")
        assert profile.avg_paddle_y_ratio < 0.5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_state(paddle_y: float, ball_y: float, ball_vx: float) -> MagicMock:
    state = MagicMock()
    state.player_paddle.y = paddle_y
    state.ball.y = ball_y
    state.ball.velocity_x = ball_vx
    return state
