

import logging
from typing import AsyncIterator

import grpc

from generated import ai_opponent_service_pb2 as pb2
from generated import ai_opponent_service_pb2_grpc as pb2_grpc
from engine.strategy import AIStrategy
from engine.player_profile import PlayerProfileStore

logger = logging.getLogger(__name__)


class AIOpponentServicer(pb2_grpc.AIOpponentServiceServicer):
  

    def __init__(self) -> None:
        self._games: dict[str, AIStrategy] = {}
        self._profile_store = PlayerProfileStore()

    def _get_or_create_strategy(self, game_id: str, difficulty_value: int) -> AIStrategy:
        
        if game_id not in self._games:
            self._games[game_id] = AIStrategy(difficulty_value)
            logger.info("Created strategy for game %s (difficulty=%d)", game_id, difficulty_value)
        return self._games[game_id]

    def _cleanup_game(self, game_id: str) -> None:
       
        self._games.pop(game_id, None)

    async def GetMove(
        self,
        request: pb2.GameState,
        context: grpc.aio.ServicerContext,
    ) -> pb2.AIMove:
      
        strategy = self._get_or_create_strategy(request.game_id, request.difficulty)
        power_ups = _extract_power_ups(request)

        decision = strategy.compute_move(
            ball_x=request.ball.x,
            ball_y=request.ball.y,
            velocity_x=request.ball.velocity_x,
            velocity_y=request.ball.velocity_y,
            ai_paddle_y=request.ai_paddle.y,
            ai_paddle_height=request.ai_paddle.height,
            arena_width=request.arena.width,
            arena_height=request.arena.height,
            power_ups_enabled=request.config.power_ups_enabled,
            power_ups=power_ups,
        )

        return pb2.AIMove(
            target_y=decision.target_y,
            reaction_delay_ms=decision.reaction_delay_ms,
        )

    async def StreamMoves(
        self,
        request_iterator: AsyncIterator[pb2.GameState],
        context: grpc.aio.ServicerContext,
    ) -> AsyncIterator[pb2.AIMove]:
       
        game_id: str | None = None

        try:
            async for state in request_iterator:
                if game_id is None:
                    game_id = state.game_id

                strategy = self._get_or_create_strategy(state.game_id, state.difficulty)
                power_ups = _extract_power_ups(state)

                decision = strategy.compute_move(
                    ball_x=state.ball.x,
                    ball_y=state.ball.y,
                    velocity_x=state.ball.velocity_x,
                    velocity_y=state.ball.velocity_y,
                    ai_paddle_y=state.ai_paddle.y,
                    ai_paddle_height=state.ai_paddle.height,
                    arena_width=state.arena.width,
                    arena_height=state.arena.height,
                    power_ups_enabled=state.config.power_ups_enabled,
                    power_ups=power_ups,
                )

                yield pb2.AIMove(
                    target_y=decision.target_y,
                    reaction_delay_ms=decision.reaction_delay_ms,
                )

        except Exception as exc:
            logger.error("StreamMoves error for game %s: %s", game_id, exc)
            raise
        finally:
            if game_id:
                self._cleanup_game(game_id)
                logger.info("Stream ended, cleaned up game %s", game_id)

    async def AnalyzeMatch(
        self,
        request: pb2.MatchAnalysisRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.MatchAnalysisResponse:
        
        if not request.history:
            logger.warning("Empty match history for match %s", request.match_id)
            return pb2.MatchAnalysisResponse(success=False, learning_rate_applied=0.0)

        arena_height = request.history[0].arena.height if request.history else 600.0

        learning_rate = self._profile_store.analyze_match(
            player_id=request.player_id,
            game_states=list(request.history),
            arena_height=arena_height,
        )

        self._cleanup_game(request.match_id)

        logger.info(
            "Analyzed match %s for player %s (result=%s, lr=%.3f)",
            request.match_id,
            request.player_id,
            request.result,
            learning_rate,
        )

        return pb2.MatchAnalysisResponse(success=True, learning_rate_applied=learning_rate)


def _extract_power_ups(state: pb2.GameState) -> list[dict]:
   
    return [
        {"type": pu.type, "x": pu.x, "y": pu.y}
        for pu in state.power_ups
    ]
