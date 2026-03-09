"""Tests for config/difficulty.py"""

import pytest

from config.difficulty import (
    DifficultyProfile,
    DIFFICULTY_PROFILES,
    get_profile,
)


class TestDifficultyProfiles:
    def test_all_four_levels_defined(self):
        assert set(DIFFICULTY_PROFILES.keys()) == {1, 2, 3, 4}

    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_profile_is_difficulty_profile(self, level):
        assert isinstance(DIFFICULTY_PROFILES[level], DifficultyProfile)

    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_reaction_delay_range_valid(self, level):
        profile = DIFFICULTY_PROFILES[level]
        assert profile.reaction_delay_min_ms >= 0
        assert profile.reaction_delay_max_ms >= profile.reaction_delay_min_ms

    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_prediction_error_range_valid(self, level):
        profile = DIFFICULTY_PROFILES[level]
        assert profile.prediction_error_min_px >= 0
        assert profile.prediction_error_max_px >= profile.prediction_error_min_px

    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_tracking_zone_ratio_within_bounds(self, level):
        profile = DIFFICULTY_PROFILES[level]
        assert 0.0 < profile.tracking_zone_ratio <= 1.0

    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_update_interval_positive(self, level):
        profile = DIFFICULTY_PROFILES[level]
        assert profile.update_interval >= 1

    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_power_up_interest_within_bounds(self, level):
        profile = DIFFICULTY_PROFILES[level]
        assert 0.0 <= profile.power_up_interest <= 1.0

    def test_harder_level_has_less_reaction_delay(self):
        """Higher difficulty should react faster."""
        easy = DIFFICULTY_PROFILES[1]
        hard = DIFFICULTY_PROFILES[3]
        assert hard.reaction_delay_max_ms < easy.reaction_delay_min_ms

    def test_harder_level_has_smaller_error(self):
        """Higher difficulty should aim more precisely."""
        easy = DIFFICULTY_PROFILES[1]
        impossible = DIFFICULTY_PROFILES[4]
        assert impossible.prediction_error_max_px < easy.prediction_error_min_px

    def test_harder_level_has_wider_tracking_zone(self):
        easy = DIFFICULTY_PROFILES[1]
        hard = DIFFICULTY_PROFILES[3]
        assert hard.tracking_zone_ratio > easy.tracking_zone_ratio

    def test_profile_is_frozen(self):
        profile = DIFFICULTY_PROFILES[1]
        with pytest.raises((AttributeError, TypeError)):
            profile.update_interval = 99  # type: ignore[misc]


class TestGetProfile:
    @pytest.mark.parametrize("level", [1, 2, 3, 4])
    def test_known_levels_return_correct_profile(self, level):
        assert get_profile(level) is DIFFICULTY_PROFILES[level]

    def test_unspecified_zero_falls_back_to_medium(self):
        assert get_profile(0) is DIFFICULTY_PROFILES[2]

    def test_unknown_level_falls_back_to_medium(self):
        assert get_profile(99) is DIFFICULTY_PROFILES[2]

    def test_negative_level_falls_back_to_medium(self):
        assert get_profile(-1) is DIFFICULTY_PROFILES[2]
