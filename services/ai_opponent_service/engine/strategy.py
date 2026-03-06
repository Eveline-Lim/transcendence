

import random
from dataclasses import dataclass

from config.difficulty import DifficultyProfile, get_profile
from engine.humanizer import Humanizer
from engine.predictor import predict_ball_impact


BENEFICIAL_POWER_UPS = {"SPEED_BOOST", "PADDLE_ENLARGE"}


@dataclass
class MoveDecision:
 

    target_y: float
    reaction_delay_ms: float


class AIStrategy:
  

    def __init__(self, difficulty_value: int) -> None:
        self.profile: DifficultyProfile = get_profile(difficulty_value)
        self.humanizer = Humanizer(self.profile)

    def reset(self) -> None:
        
        self.humanizer.reset()

    def compute_move(
        self,
        ball_x: float,
        ball_y: float,
        velocity_x: float,
        velocity_y: float,
        ai_paddle_y: float,
        ai_paddle_height: float,
        arena_width: float,
        arena_height: float,
        power_ups_enabled: bool,
        power_ups: list[dict],
    ) -> MoveDecision:
      
        ai_paddle_x = arena_width

        if not self.humanizer.is_ball_in_tracking_zone(ball_x, arena_width, ai_paddle_x):
            center_target = self.humanizer.maybe_return_to_center(arena_height)
            idle_target = center_target if center_target is not None else ai_paddle_y
            return MoveDecision(
                target_y=idle_target,
                reaction_delay_ms=self.humanizer.get_reaction_delay(),
            )

        impact = predict_ball_impact(
            ball_x=ball_x,
            ball_y=ball_y,
            velocity_x=velocity_x,
            velocity_y=velocity_y,
            arena_width=arena_width,
            arena_height=arena_height,
            ai_paddle_x=ai_paddle_x,
        )

        if impact.is_approaching:
            target_y = impact.y
        else:
            center = self.humanizer.maybe_return_to_center(arena_height)
            target_y = center if center is not None else ai_paddle_y

        if power_ups_enabled and impact.is_approaching and impact.time_to_impact > 50.0:
            power_up_target = self._evaluate_power_ups(
                power_ups=power_ups,
                current_target_y=target_y,
                ai_paddle_x=ai_paddle_x,
                ai_paddle_y=ai_paddle_y,
                arena_height=arena_height,
            )
            if power_up_target is not None:
                target_y = power_up_target

      
        imperfect_target = self.humanizer.apply_prediction_error(target_y, arena_height)
        final_target = self.humanizer.filter_target(imperfect_target)

        return MoveDecision(
            target_y=final_target,
            reaction_delay_ms=self.humanizer.get_reaction_delay(),
        )

    def _evaluate_power_ups(
        self,
        power_ups: list[dict],
        current_target_y: float,
        ai_paddle_x: float,
        ai_paddle_y: float,
        arena_height: float,
    ) -> float | None:
        best_power_up = None
        best_distance = float("inf")

        for power_up in power_ups:
            if power_up.get("type") not in BENEFICIAL_POWER_UPS:
                continue

            pu_x = power_up.get("x", 0.0)
            if pu_x < ai_paddle_x / 2:
                continue

            distance_y = abs(power_up.get("y", 0.0) - ai_paddle_y)
            if distance_y < best_distance:
                best_distance = distance_y
                best_power_up = power_up

        if best_power_up is None:
            return None

        if random.random() > self.profile.power_up_interest:
            return None

        pu_y = best_power_up.get("y", current_target_y)
        blended_target = 0.7 * current_target_y + 0.3 * pu_y
        return max(0.0, min(arena_height, blended_target))
