"""Test client for the AI Opponent gRPC service.

Run this while server.py is running in another terminal.
Usage: python3 test_client.py
"""

import asyncio
import grpc

from generated import ai_opponent_service_pb2 as pb2
from generated import ai_opponent_service_pb2_grpc as pb2_grpc


def make_game_state(
    ball_x: float = 400.0,
    ball_y: float = 300.0,
    vx: float = 5.0,
    vy: float = 2.0,
    difficulty: int = 2,
) -> pb2.GameState:
    """Build a sample GameState for testing."""
    return pb2.GameState(
        game_id="test-game-001",
        difficulty=difficulty,
        ball=pb2.BallState(x=ball_x, y=ball_y, velocity_x=vx, velocity_y=vy),
        ai_paddle=pb2.PaddleState(y=300.0, height=80.0, speed=5.0),
        player_paddle=pb2.PaddleState(y=250.0, height=80.0, speed=5.0),
        arena=pb2.ArenaBounds(width=800.0, height=600.0),
        ai_score=0,
        player_score=0,
        config=pb2.GameConfig(
            power_ups_enabled=False,
            paddle_speed_multiplier=1.0,
            ball_speed_multiplier=1.0,
        ),
    )


async def test_get_move(stub: pb2_grpc.AIOpponentServiceStub) -> None:
    """Test the GetMove RPC (single request/response)."""
    print("=" * 50)
    print("TEST 1: GetMove (single call)")
    print("=" * 50)

    for diff_name, diff_val in [("EASY", 1), ("MEDIUM", 2), ("HARD", 3), ("IMPOSSIBLE", 4)]:
        state = make_game_state(difficulty=diff_val)
        response = await stub.GetMove(state)
        print(f"  {diff_name:12s} → target_y={response.target_y:.1f}, delay={response.reaction_delay_ms:.1f}ms")

    print("  ✅ GetMove OK\n")


async def test_stream_moves(stub: pb2_grpc.AIOpponentServiceStub) -> None:
    """Test the StreamMoves RPC (bidirectional streaming)."""
    print("=" * 50)
    print("TEST 2: StreamMoves (10 frames, ball moving right)")
    print("=" * 50)

    async def state_generator():
        """Simulate 10 frames of ball movement."""
        ball_x = 100.0
        ball_y = 300.0
        vx = 6.0
        vy = -3.0
        for frame in range(10):
            ball_x += vx
            ball_y += vy
            # Simple bounce
            if ball_y <= 0 or ball_y >= 600:
                vy = -vy
            yield make_game_state(ball_x=ball_x, ball_y=ball_y, vx=vx, vy=vy, difficulty=3)

    responses = []
    async for move in stub.StreamMoves(state_generator()):
        responses.append(move)
        print(f"  Frame {len(responses):2d} → target_y={move.target_y:.1f}, delay={move.reaction_delay_ms:.1f}ms")

    assert len(responses) == 10, f"Expected 10 responses, got {len(responses)}"
    print("  ✅ StreamMoves OK\n")


async def test_analyze_match(stub: pb2_grpc.AIOpponentServiceStub) -> None:
    """Test the AnalyzeMatch RPC (pattern learning)."""
    print("=" * 50)
    print("TEST 3: AnalyzeMatch (pattern learning)")
    print("=" * 50)

    # Build a fake match history (20 states)
    history = []
    for i in range(20):
        state = make_game_state(ball_x=float(i * 40), ball_y=float(100 + i * 20))
        history.append(state)

    request = pb2.MatchAnalysisRequest(
        match_id="match-001",
        player_id="player-42",
        history=history,
        result="WIN",
    )

    response = await stub.AnalyzeMatch(request)
    print(f"  success={response.success}, learning_rate={response.learning_rate_applied:.3f}")
    assert response.success is True
    print("  ✅ AnalyzeMatch OK\n")


async def test_power_ups(stub: pb2_grpc.AIOpponentServiceStub) -> None:
    """Test GetMove with power-ups enabled."""
    print("=" * 50)
    print("TEST 4: GetMove with power-ups")
    print("=" * 50)

    state = pb2.GameState(
        game_id="test-powerup-001",
        difficulty=4,  # IMPOSSIBLE
        ball=pb2.BallState(x=200.0, y=300.0, velocity_x=5.0, velocity_y=1.0),
        ai_paddle=pb2.PaddleState(y=300.0, height=80.0, speed=5.0),
        player_paddle=pb2.PaddleState(y=250.0, height=80.0, speed=5.0),
        arena=pb2.ArenaBounds(width=800.0, height=600.0),
        ai_score=2,
        player_score=1,
        power_ups=[
            pb2.PowerUp(type="PADDLE_ENLARGE", x=600.0, y=200.0),
            pb2.PowerUp(type="SPEED_BOOST", x=700.0, y=400.0),
        ],
        config=pb2.GameConfig(
            power_ups_enabled=True,
            paddle_speed_multiplier=1.0,
            ball_speed_multiplier=1.5,
        ),
    )

    response = await stub.GetMove(state)
    print(f"  target_y={response.target_y:.1f}, delay={response.reaction_delay_ms:.1f}ms")
    print("  ✅ Power-ups OK\n")


async def main() -> None:
    """Run all tests against the running server."""
    print("\n🏓 AI Opponent gRPC Test Client\n")

    async with grpc.aio.insecure_channel("localhost:50051") as channel:
        stub = pb2_grpc.AIOpponentServiceStub(channel)

        await test_get_move(stub)
        await test_stream_moves(stub)
        await test_analyze_match(stub)
        await test_power_ups(stub)

    print("=" * 50)
    print("🎉 ALL TESTS PASSED")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
