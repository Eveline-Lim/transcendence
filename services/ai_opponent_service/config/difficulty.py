"""Difficulty configuration for each AI level.

Each difficulty level defines a set of behavioral parameters that control
how "human-like" the AI behaves. Lower difficulty = more imperfections.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DifficultyProfile:
    """Behavioral parameters for a single difficulty level.

    Attributes:
        reaction_delay_min_ms: Minimum simulated reaction time in milliseconds.
        reaction_delay_max_ms: Maximum simulated reaction time in milliseconds.
        prediction_error_min_px: Minimum offset applied to predicted ball position.
        prediction_error_max_px: Maximum offset applied to predicted ball position.
        update_interval: AI recalculates every N frames (1 = every frame).
        tracking_zone_ratio: Fraction of the arena width where AI tracks the ball.
            Example: 0.6 means AI only reacts when ball is in the 60% closest to its paddle.
        return_to_center_probability: Chance AI moves toward center when ball is far away.
        power_up_interest: How likely AI is to deviate toward a beneficial power-up (0.0 to 1.0).
    """

    reaction_delay_min_ms: float
    reaction_delay_max_ms: float
    prediction_error_min_px: float
    prediction_error_max_px: float
    update_interval: int
    tracking_zone_ratio: float
    return_to_center_probability: float
    power_up_interest: float


# Proto enum values: EASY=1, MEDIUM=2, HARD=3, IMPOSSIBLE=4
DIFFICULTY_PROFILES: dict[int, DifficultyProfile] = {
    1: DifficultyProfile(
        reaction_delay_min_ms=150.0,
        reaction_delay_max_ms=300.0,
        prediction_error_min_px=40.0,
        prediction_error_max_px=80.0,
        update_interval=3,
        tracking_zone_ratio=0.60,
        return_to_center_probability=0.90,
        power_up_interest=0.2,
    ),
    2: DifficultyProfile(
        reaction_delay_min_ms=80.0,
        reaction_delay_max_ms=150.0,
        prediction_error_min_px=15.0,
        prediction_error_max_px=40.0,
        update_interval=2,
        tracking_zone_ratio=0.75,
        return_to_center_probability=0.60,
        power_up_interest=0.5,
    ),
    3: DifficultyProfile(
        reaction_delay_min_ms=30.0,
        reaction_delay_max_ms=80.0,
        prediction_error_min_px=5.0,
        prediction_error_max_px=15.0,
        update_interval=1,
        tracking_zone_ratio=0.90,
        return_to_center_probability=0.30,
        power_up_interest=0.7,
    ),
    4: DifficultyProfile(
        reaction_delay_min_ms=0.0,
        reaction_delay_max_ms=0.0,
        prediction_error_min_px=0.0,
        prediction_error_max_px=0.0,
        update_interval=1,
        tracking_zone_ratio=1.00,
        return_to_center_probability=0.0,
        power_up_interest=1.0,
    ),
}


def get_profile(difficulty_value: int) -> DifficultyProfile:
    """Return the profile for a given proto Difficulty enum value.

    Falls back to MEDIUM (2) if the value is unknown or UNSPECIFIED (0).
    """
    return DIFFICULTY_PROFILES.get(difficulty_value, DIFFICULTY_PROFILES[2])
