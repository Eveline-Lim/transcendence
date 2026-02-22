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
    // Notifications
    private boolean notifyFriendRequests;
    private boolean notifyGameInvites;
    private boolean notifyTournamentUpdates;
    // Game
    private String paddleColor;
    private String ballColor;
    private String tableColor;
    private boolean showFps;
    private boolean enablePowerUps;
    // Privacy
    private boolean showOnlineStatus;
    private boolean allowFriendRequests;
    private boolean showMatchHistory;
    private boolean showStatistics;
}
