
from dataclasses import dataclass


@dataclass
class PredictedImpact:
   

    y: float
    time_to_impact: float
    is_approaching: bool


def predict_ball_impact(
    ball_x: float,
    ball_y: float,
    velocity_x: float,
    velocity_y: float,
    arena_width: float,
    arena_height: float,
    ai_paddle_x: float,
) -> PredictedImpact:
   
   
    ball_moving_toward_ai = (velocity_x > 0 and ai_paddle_x > ball_x) or (
        velocity_x < 0 and ai_paddle_x < ball_x
    )
    if not ball_moving_toward_ai or velocity_x == 0:
        return PredictedImpact(y=ball_y, time_to_impact=float("inf"), is_approaching=False)

    sim_x = ball_x
    sim_y = ball_y
    sim_vx = velocity_x
    sim_vy = velocity_y
    time_elapsed = 0.0

    speed = (sim_vx**2 + sim_vy**2) ** 0.5
    if speed == 0:
        return PredictedImpact(y=ball_y, time_to_impact=float("inf"), is_approaching=False)

    dt = 1.0 / speed
    max_iterations = int(arena_width * arena_height)  

    for _ in range(max_iterations):
        sim_x += sim_vx * dt
        sim_y += sim_vy * dt
        time_elapsed += dt

        if sim_y <= 0:
            sim_y = -sim_y
            sim_vy = abs(sim_vy)
        elif sim_y >= arena_height:
            sim_y = 2 * arena_height - sim_y
            sim_vy = -abs(sim_vy)

     
        reached_ai = (sim_vx > 0 and sim_x >= ai_paddle_x) or (
            sim_vx < 0 and sim_x <= ai_paddle_x
        )
        if reached_ai:
            impact_y = max(0.0, min(arena_height, sim_y))
            return PredictedImpact(y=impact_y, time_to_impact=time_elapsed, is_approaching=True)

    return PredictedImpact(y=ball_y, time_to_impact=float("inf"), is_approaching=False)
