package com.transcendence.player.entity;

import java.util.UUID;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "player_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerPreferences {

    @Id
    private UUID playerId;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @MapsId
    @JoinColumn(name = "player_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Player player;

    // General
    @Builder.Default
    private String theme = "system"; // light, dark, system

    @Builder.Default
    private String language = "en";

    @Builder.Default
    private boolean soundEnabled = true;

    @Builder.Default
    private boolean musicEnabled = true;

    @Builder.Default
    private int soundVolume = 80;

    @Builder.Default
    private int musicVolume = 50;

    // Notifications
    @Builder.Default
    private boolean notifyFriendRequests = true;

    @Builder.Default
    private boolean notifyGameInvites = true;

    @Builder.Default
    private boolean notifyTournamentUpdates = false;

    // Game settings
    @Builder.Default
    private String paddleColor = "#FFFFFF";

    @Builder.Default
    private String ballColor = "#FFFFFF";

    @Builder.Default
    private String tableColor = "#000000";

    @Builder.Default
    private boolean showFps = false;

    @Builder.Default
    private boolean enablePowerUps = true;

    // Privacy
    @Builder.Default
    private boolean showOnlineStatus = true;

    @Builder.Default
    private boolean allowFriendRequests = true;

    @Builder.Default
    private boolean showMatchHistory = true;

    @Builder.Default
    private boolean showStatistics = true;
}
