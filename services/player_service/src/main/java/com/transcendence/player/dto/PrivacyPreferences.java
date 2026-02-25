package com.transcendence.player.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrivacyPreferences {
    private Boolean showOnlineStatus;
    private Boolean allowFriendRequests;
    private Boolean showMatchHistory;
    private Boolean showStatistics;
}
