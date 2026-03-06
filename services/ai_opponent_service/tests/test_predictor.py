"""Tests for engine/predictor.py"""

import pytest

from engine.predictor import predict_ball_impact, PredictedImpact

ARENA_W = 800.0
ARENA_H = 600.0
AI_PADDLE_X = 800.0  # right side


class TestPredictedImpactDataclass:
    def test_fields(self):
        impact = PredictedImpact(y=300.0, time_to_impact=10.0, is_approaching=True)
        assert impact.y == 300.0
        assert impact.time_to_impact == 10.0
        assert impact.is_approaching is True


class TestBallNotApproaching:
    def test_ball_moving_away_returns_not_approaching(self):
        # Ball moving LEFT (negative vx) while AI paddle is on the right → not approaching
        result = predict_ball_impact(
            ball_x=400.0, ball_y=300.0,
            velocity_x=-5.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is False
        assert result.time_to_impact == float("inf")

    def test_zero_velocity_x_returns_not_approaching(self):
        result = predict_ball_impact(
            ball_x=400.0, ball_y=300.0,
            velocity_x=0.0, velocity_y=3.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is False

    def test_ball_already_past_ai_paddle(self):
        # Ball is to the right of the paddle moving further right → not approaching
        result = predict_ball_impact(
            ball_x=850.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is False


class TestBallApproaching:
    def test_straight_horizontal_ball_hits_center(self):
        # Ball going straight right at vertical center
        result = predict_ball_impact(
            ball_x=0.0, ball_y=300.0,
            velocity_x=10.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is True
        assert abs(result.y - 300.0) < 1.0
        assert result.time_to_impact > 0

    def test_impact_y_clamped_within_arena(self):
        # Ball heading to top-right corner
        result = predict_ball_impact(
            ball_x=0.0, ball_y=10.0,
            velocity_x=10.0, velocity_y=-5.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is True
        assert 0.0 <= result.y <= ARENA_H

    def test_ball_bounces_off_bottom_wall(self):
        # Ball heading toward bottom wall then bouncing toward AI
        result = predict_ball_impact(
            ball_x=400.0, ball_y=580.0,
            velocity_x=8.0, velocity_y=10.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is True
        assert 0.0 <= result.y <= ARENA_H

    def test_ball_bounces_off_top_wall(self):
        result = predict_ball_impact(
            ball_x=400.0, ball_y=20.0,
            velocity_x=8.0, velocity_y=-10.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is True
        assert 0.0 <= result.y <= ARENA_H

    def test_time_to_impact_positive(self):
        result = predict_ball_impact(
            ball_x=200.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert result.is_approaching is True
        assert result.time_to_impact > 0

    def test_closer_ball_has_shorter_time_to_impact(self):
        far = predict_ball_impact(
            ball_x=100.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        close = predict_ball_impact(
            ball_x=600.0, ball_y=300.0,
            velocity_x=5.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=AI_PADDLE_X,
        )
        assert close.time_to_impact < far.time_to_impact


class TestLeftSideAIPaddle:
    def test_ball_approaching_left_paddle(self):
        # AI paddle on the left, ball moving left
        result = predict_ball_impact(
            ball_x=400.0, ball_y=300.0,
            velocity_x=-5.0, velocity_y=0.0,
            arena_width=ARENA_W, arena_height=ARENA_H,
            ai_paddle_x=0.0,
        )
        assert result.is_approaching is True
        assert abs(result.y - 300.0) < 1.0
