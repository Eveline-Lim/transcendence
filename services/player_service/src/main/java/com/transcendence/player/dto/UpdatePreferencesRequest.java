package com.transcendence.player.dto;

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

    @Min(0) @Max(100)
    private Integer soundVolume;

    @Min(0) @Max(100)
    private Integer musicVolume;

    // Notifications
    private Boolean notifyFriendRequests;
    private Boolean notifyGameInvites;
    private Boolean notifyTournamentUpdates;

    // Game settings
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String paddleColor;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String ballColor;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String tableColor;

    private Boolean showFps;
    private Boolean enablePowerUps;

    // Privacy
    private Boolean showOnlineStatus;
    private Boolean allowFriendRequests;
    private Boolean showMatchHistory;
    private Boolean showStatistics;
}
