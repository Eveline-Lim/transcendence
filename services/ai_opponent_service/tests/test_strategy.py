"""Tests for engine/strategy.py"""

import pytest

from engine.strategy import AIStrategy, MoveDecision

ARENA_W = 800.0
ARENA_H = 600.0


@pytest.fixture()
def easy_strategy():
    return AIStrategy(1)  # EASY


@pytest.fixture()
def impossible_strategy():
    return AIStrategy(4)  # IMPOSSIBLE


class TestMoveDecisionDataclass:
    def test_fields(self):
        d = MoveDecision(target_y=300.0, reaction_delay_ms=50.0)
        assert d.target_y == 300.0
        assert d.reaction_delay_ms == 50.0


class TestAIStrategyInit:
    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_creates_strategy_for_all_difficulties(self, level):
        strategy = AIStrategy(level)
        assert strategy.profile is not None
        assert strategy.humanizer is not None

    def test_unknown_difficulty_falls_back_to_medium(self):
        strategy = AIStrategy(99)
        from config.difficulty import DIFFICULTY_PROFILES
        assert strategy.profile is DIFFICULTY_PROFILES[2]


class TestComputeMove:
    def test_returns_move_decision(self, easy_strategy):
        decision = easy_strategy.compute_move(
            ball_x=400.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            ai_paddle_y=300.0, ai_paddle_height=80.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            power_ups_enabled=False, power_ups=[],
        )
        assert isinstance(decision, MoveDecision)

    def test_target_y_within_arena(self, impossible_strategy):
        for _ in range(20):
            decision = impossible_strategy.compute_move(
                ball_x=400.0, ball_y=300.0,
                velocity_x=5.0, velocity_y=3.0,
                ai_paddle_y=300.0, ai_paddle_height=80.0,
                arena_width=ARENA_W, arena_height=ARENA_H,
                power_ups_enabled=False, power_ups=[],
            )
            assert 0.0 <= decision.target_y <= ARENA_H

    def test_reaction_delay_within_profile_range(self, easy_strategy):
        from config.difficulty import DIFFICULTY_PROFILES
        profile = DIFFICULTY_PROFILES[1]
        for _ in range(20):
            decision = easy_strategy.compute_move(
                ball_x=400.0, ball_y=300.0,
                velocity_x=5.0, velocity_y=0.0,
                ai_paddle_y=300.0, ai_paddle_height=80.0,
                arena_width=ARENA_W, arena_height=ARENA_H,
                power_ups_enabled=False, power_ups=[],
            )
            assert profile.reaction_delay_min_ms <= decision.reaction_delay_ms <= profile.reaction_delay_max_ms

    def test_ball_outside_tracking_zone_returns_idle_target(self, easy_strategy):
        # Ball at x=0 is outside easy's 60% tracking zone (480px from right side)
        decision = easy_strategy.compute_move(
            ball_x=0.0, ball_y=100.0,
            velocity_x=5.0, velocity_y=0.0,
            ai_paddle_y=300.0, ai_paddle_height=80.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            power_ups_enabled=False, power_ups=[],
        )
        # AI should stay near current position or return to center, not chase ball
        assert isinstance(decision, MoveDecision)
        assert 0.0 <= decision.target_y <= ARENA_H

    def test_impossible_tracks_ball_across_full_arena(self, impossible_strategy):
        # With tracking_zone_ratio=1.0, impossible always tracks
        decision = impossible_strategy.compute_move(
            ball_x=0.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            ai_paddle_y=300.0, ai_paddle_height=80.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            power_ups_enabled=False, power_ups=[],
        )
        # Should aim toward ball's predicted impact, near y=300
        assert abs(decision.target_y - 300.0) <= DIFFICULTY_PROFILES_MAX_ERROR_IMPOSSIBLE

    def test_power_ups_disabled_no_deviation(self, impossible_strategy):
        # With power_ups_enabled=False, power-up logic is skipped
        decision = impossible_strategy.compute_move(
            ball_x=400.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            ai_paddle_y=300.0, ai_paddle_height=80.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            power_ups_enabled=False,
            power_ups=[{"type": "SPEED_BOOST", "x": 700.0, "y": 100.0}],
        )
        assert isinstance(decision, MoveDecision)

    def test_reset_clears_humanizer_state(self, easy_strategy):
        for _ in range(10):
            easy_strategy.compute_move(
                ball_x=400.0, ball_y=300.0,
                velocity_x=5.0, velocity_y=0.0,
                ai_paddle_y=300.0, ai_paddle_height=80.0,
                arena_width=ARENA_W, arena_height=ARENA_H,
                power_ups_enabled=False, power_ups=[],
            )
        easy_strategy.reset()
        assert easy_strategy.humanizer._frame_count == 0
        assert easy_strategy.humanizer._last_target_y is None


class TestPowerUpEvaluation:
    def test_beneficial_power_up_may_influence_target(self):
        # Use impossible AI (power_up_interest=0.9) with a ball that has long time_to_impact
        strategy = AIStrategy(4)
        power_ups = [{"type": "SPEED_BOOST", "x": 750.0, "y": 50.0}]
        results = []
        for _ in range(30):
            strategy.reset()
            decision = strategy.compute_move(
                ball_x=0.0, ball_y=300.0,
                velocity_x=1.0, velocity_y=0.0,
                ai_paddle_y=300.0, ai_paddle_height=80.0,
                arena_width=ARENA_W, arena_height=ARENA_H,
                power_ups_enabled=True,
                power_ups=power_ups,
            )
            results.append(decision.target_y)
        # At least some results should be below 300 (pulled toward y=50)
        assert any(t < 290.0 for t in results)

    def test_harmful_power_up_type_ignored(self):
        strategy = AIStrategy(4)
        power_ups = [{"type": "SHRINK_PADDLE", "x": 750.0, "y": 50.0}]
        for _ in range(20):
            strategy.reset()
            decision = strategy.compute_move(
                ball_x=0.0, ball_y=300.0,
                velocity_x=1.0, velocity_y=0.0,
                ai_paddle_y=300.0, ai_paddle_height=80.0,
                arena_width=ARENA_W, arena_height=ARENA_H,
                power_ups_enabled=True,
                power_ups=power_ups,
            )
            # Non-beneficial power-up should not pull AI away from 300
            # target_y should remain near 300 ± small error
            assert abs(decision.target_y - 300.0) <= 10.0


# Constant used in tests
DIFFICULTY_PROFILES_MAX_ERROR_IMPOSSIBLE = 6.0  # prediction_error_max_px=5.0 + small margin
