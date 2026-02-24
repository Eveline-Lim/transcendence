package com.transcendence.player.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdatePreferencesRequest {

    @Pattern(regexp = "^(light|dark|system)$")
    private String theme;

    @Pattern(regexp = "^[a-z]{2}(-[A-Z]{2})?$")
    private String language;

    private Boolean soundEnabled;
    private Boolean musicEnabled;

    @Min(0)
    @Max(100)
    private Integer soundVolume;

    @Min(0)
    @Max(100)
    private Integer musicVolume;

    @Valid
    private NotificationPreferences notifications;

    @Valid
    private GamePreferences gameSettings;

    @Valid
    private PrivacyPreferences privacy;
}
