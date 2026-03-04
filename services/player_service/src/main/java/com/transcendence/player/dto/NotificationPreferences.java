package com.transcendence.player.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferences {
    private Boolean friendRequests;
    private Boolean gameInvites;
    private Boolean tournamentUpdates;
}
