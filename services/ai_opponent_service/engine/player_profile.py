
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PlayerProfile:
   
    matches_played: int = 0
    avg_paddle_y_ratio: float = 0.5
    top_zone_hits: int = 0
    center_zone_hits: int = 0
    bottom_zone_hits: int = 0

    @property
    def preferred_zone(self) -> str:
       
        zones = {
            "top": self.top_zone_hits,
            "center": self.center_zone_hits,
            "bottom": self.bottom_zone_hits,
        }
        return max(zones, key=zones.get)  # type: ignore[arg-type]

    @property
    def bias_offset(self) -> float:
     
        total = self.top_zone_hits + self.center_zone_hits + self.bottom_zone_hits
        if total < 5:
            return 0.0

        top_ratio = self.top_zone_hits / total
        bottom_ratio = self.bottom_zone_hits / total
        return (bottom_ratio - top_ratio) * 0.15


class PlayerProfileStore:
   

    def __init__(self) -> None:
        self._profiles: dict[str, PlayerProfile] = {}

    def get_profile(self, player_id: str) -> PlayerProfile:
       
        if player_id not in self._profiles:
            self._profiles[player_id] = PlayerProfile()
        return self._profiles[player_id]

    def analyze_match(
        self,
        player_id: str,
        game_states: list,
        arena_height: float,
    ) -> float:
       
        profile = self.get_profile(player_id)

        if not game_states or arena_height <= 0:
            logger.warning("Empty history or invalid arena for player %s", player_id)
            return 0.0

        paddle_y_sum = 0.0
        paddle_count = 0
        new_top = 0
        new_center = 0
        new_bottom = 0

        third = arena_height / 3.0

        for state in game_states:
            player_paddle_y = _extract_paddle_y(state)
            if player_paddle_y is not None:
                paddle_y_sum += player_paddle_y
                paddle_count += 1

            ball_vx = _extract_ball_vx(state)
            ball_y = _extract_ball_y(state)

            # Count ball zone when it's heading toward AI (velocity_x > 0)
            if ball_vx is not None and ball_vx > 0 and ball_y is not None:
                if ball_y < third:
                    new_top += 1
                elif ball_y < 2 * third:
                    new_center += 1
                else:
                    new_bottom += 1

        # Exponential moving average — adapts faster for new players
        learning_rate = 0.3 if profile.matches_played < 3 else 0.15

        if paddle_count > 0:
            new_avg = paddle_y_sum / (paddle_count * arena_height)
            profile.avg_paddle_y_ratio = (
                (1 - learning_rate) * profile.avg_paddle_y_ratio + learning_rate * new_avg
            )

        profile.top_zone_hits += new_top
        profile.center_zone_hits += new_center
        profile.bottom_zone_hits += new_bottom
        profile.matches_played += 1

        logger.info(
            "Updated profile for %s: zone=%s, bias=%.3f, matches=%d",
            player_id,
            profile.preferred_zone,
            profile.bias_offset,
            profile.matches_played,
        )

        return learning_rate


def _extract_paddle_y(state: object) -> float | None:
    
    try:
        paddle = getattr(state, "player_paddle", None)
        if paddle is not None:
            return float(paddle.y)
    except (AttributeError, TypeError):
        pass
    return None


def _extract_ball_y(state: object) -> float | None:
    try:
        ball = getattr(state, "ball", None)
        if ball is not None:
            return float(ball.y)
    except (AttributeError, TypeError):
        pass
    return None


def _extract_ball_vx(state: object) -> float | None:
    try:
        ball = getattr(state, "ball", None)
        if ball is not None:
            return float(ball.velocity_x)
    except (AttributeError, TypeError):
        pass
    return None
