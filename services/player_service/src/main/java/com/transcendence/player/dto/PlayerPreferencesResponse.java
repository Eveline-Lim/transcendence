package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerPreferencesResponse {
    // General
    private String theme;
    private String language;
    private boolean soundEnabled;
    private boolean musicEnabled;
    private int soundVolume;
    private int musicVolume;
    // Nested
    private NotificationPreferences notifications;
    private GamePreferences gameSettings;
    private PrivacyPreferences privacy;
}
