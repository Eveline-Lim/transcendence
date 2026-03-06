"""Tests for service/ai_service.py"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from service.ai_service import AIOpponentServicer
from generated import ai_opponent_service_pb2 as pb2


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_game_state(
    game_id: str = "game_1",
    difficulty: int = 2,
    ball_x: float = 400.0,
    ball_y: float = 300.0,
    velocity_x: float = 5.0,
    velocity_y: float = 0.0,
    ai_paddle_y: float = 300.0,
    ai_paddle_height: float = 80.0,
    arena_width: float = 800.0,
    arena_height: float = 600.0,
    power_ups_enabled: bool = False,
) -> pb2.GameState:
    state = pb2.GameState()
    state.game_id = game_id
    state.difficulty = difficulty
    state.ball.x = ball_x
    state.ball.y = ball_y
    state.ball.velocity_x = velocity_x
    state.ball.velocity_y = velocity_y
    state.ai_paddle.y = ai_paddle_y
    state.ai_paddle.height = ai_paddle_height
    state.arena.width = arena_width
    state.arena.height = arena_height
    state.config.power_ups_enabled = power_ups_enabled
    return state


def _make_context() -> MagicMock:
    return AsyncMock(spec=["abort", "set_code", "set_details"])


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetMove:
    @pytest.mark.asyncio
    async def test_returns_ai_move(self):
        servicer = AIOpponentServicer()
        state = _make_game_state()
        move = await servicer.GetMove(state, _make_context())
        assert isinstance(move, pb2.AIMove)

    @pytest.mark.asyncio
    async def test_target_y_within_arena(self):
        servicer = AIOpponentServicer()
        state = _make_game_state(arena_height=600.0)
        for _ in range(10):
            move = await servicer.GetMove(state, _make_context())
            assert 0.0 <= move.target_y <= 600.0

    @pytest.mark.asyncio
    async def test_reaction_delay_non_negative(self):
        servicer = AIOpponentServicer()
        state = _make_game_state()
        move = await servicer.GetMove(state, _make_context())
        assert move.reaction_delay_ms >= 0.0

    @pytest.mark.asyncio
    async def test_same_game_id_reuses_strategy(self):
        servicer = AIOpponentServicer()
        state = _make_game_state(game_id="persistent_game")
        await servicer.GetMove(state, _make_context())
        assert "persistent_game" in servicer._games
        strategy_before = servicer._games["persistent_game"]
        await servicer.GetMove(state, _make_context())
        assert servicer._games["persistent_game"] is strategy_before

    @pytest.mark.asyncio
    async def test_different_game_ids_create_different_strategies(self):
        servicer = AIOpponentServicer()
        state_a = _make_game_state(game_id="game_a")
        state_b = _make_game_state(game_id="game_b")
        await servicer.GetMove(state_a, _make_context())
        await servicer.GetMove(state_b, _make_context())
        assert servicer._games["game_a"] is not servicer._games["game_b"]

    @pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
    @pytest.mark.asyncio
    async def test_all_difficulties_return_valid_move(self, difficulty):
        servicer = AIOpponentServicer()
        state = _make_game_state(game_id=f"game_diff_{difficulty}", difficulty=difficulty)
        move = await servicer.GetMove(state, _make_context())
        assert 0.0 <= move.target_y <= 600.0


class TestStreamMoves:
    @pytest.mark.asyncio
    async def test_streams_one_move_per_state(self):
        servicer = AIOpponentServicer()
        states = [_make_game_state(game_id="stream_game") for _ in range(5)]

        async def request_iterator():
            for s in states:
                yield s

        moves = []
        async for move in servicer.StreamMoves(request_iterator(), _make_context()):
            moves.append(move)

        assert len(moves) == 5

    @pytest.mark.asyncio
    async def test_stream_cleans_up_game_on_finish(self):
        servicer = AIOpponentServicer()

        async def request_iterator():
            yield _make_game_state(game_id="cleanup_game")

        async for _ in servicer.StreamMoves(request_iterator(), _make_context()):
            pass

        assert "cleanup_game" not in servicer._games

    @pytest.mark.asyncio
    async def test_stream_target_y_always_within_arena(self):
        servicer = AIOpponentServicer()
        states = [
            _make_game_state(game_id="bounds_game", ball_y=float(y))
            for y in range(0, 601, 100)
        ]

        async def request_iterator():
            for s in states:
                yield s

        async for move in servicer.StreamMoves(request_iterator(), _make_context()):
            assert 0.0 <= move.target_y <= 600.0


class TestAnalyzeMatch:
    @pytest.mark.asyncio
    async def test_empty_history_returns_failure(self):
        servicer = AIOpponentServicer()
        request = pb2.MatchAnalysisRequest()
        request.match_id = "match_1"
        request.player_id = "player_1"
        response = await servicer.AnalyzeMatch(request, _make_context())
        assert response.success is False
        assert response.learning_rate_applied == 0.0

    @pytest.mark.asyncio
    async def test_valid_history_returns_success(self):
        servicer = AIOpponentServicer()
        request = pb2.MatchAnalysisRequest()
        request.match_id = "match_2"
        request.player_id = "player_2"
        request.history.append(_make_game_state(game_id="match_2"))
        request.result = "WIN"
        response = await servicer.AnalyzeMatch(request, _make_context())
        assert response.success is True

    @pytest.mark.asyncio
    async def test_analyze_match_cleans_up_game(self):
        servicer = AIOpponentServicer()
        state = _make_game_state(game_id="match_3")
        servicer._games["match_3"] = MagicMock()

        request = pb2.MatchAnalysisRequest()
        request.match_id = "match_3"
        request.player_id = "player_3"
        request.history.append(state)
        await servicer.AnalyzeMatch(request, _make_context())

        assert "match_3" not in servicer._games

    @pytest.mark.asyncio
    async def test_learning_rate_non_negative(self):
        servicer = AIOpponentServicer()
        request = pb2.MatchAnalysisRequest()
        request.match_id = "match_4"
        request.player_id = "player_4"
        request.history.append(_make_game_state(game_id="match_4"))
        response = await servicer.AnalyzeMatch(request, _make_context())
        assert response.learning_rate_applied >= 0.0
