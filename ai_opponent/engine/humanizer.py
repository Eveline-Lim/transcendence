

import random

from config.difficulty import DifficultyProfile


class Humanizer:
   

    def __init__(self, profile: DifficultyProfile) -> None:
        self.profile = profile
        self._frame_count: int = 0
        self._last_target_y: float | None = None

    def reset(self) -> None:
       
        self._frame_count = 0
        self._last_target_y = None

    def should_update(self) -> bool:
      
        self._frame_count += 1
        return self._frame_count % self.profile.update_interval == 0

    def apply_prediction_error(self, perfect_target_y: float, arena_height: float) -> float:
      
        error_range = random.uniform(
            self.profile.prediction_error_min_px,
            self.profile.prediction_error_max_px,
        )
        error = random.uniform(-error_range, error_range)
        noisy_target = perfect_target_y + error
        return max(0.0, min(arena_height, noisy_target))

    def get_reaction_delay(self) -> float:
        
        return random.uniform(
            self.profile.reaction_delay_min_ms,
            self.profile.reaction_delay_max_ms,
        )

    def maybe_return_to_center(self, arena_height: float) -> float | None:
        
        if random.random() < self.profile.return_to_center_probability:
            return arena_height / 2.0
        return None

    def is_ball_in_tracking_zone(
        self,
        ball_x: float,
        arena_width: float,
        ai_paddle_x: float,
    ) -> bool:
       
        tracking_distance = arena_width * self.profile.tracking_zone_ratio
        distance_to_ai = abs(ai_paddle_x - ball_x)
        return distance_to_ai <= tracking_distance

    def filter_target(self, new_target_y: float) -> float:
       
        if self.should_update() or self._last_target_y is None:
            self._last_target_y = new_target_y
        return self._last_target_y
