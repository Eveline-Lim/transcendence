package com.transcendence.player.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

@Entity
@Table(name = "player_statistics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerStatistics {

    @Id
    private UUID playerId;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @MapsId
    @JoinColumn(name = "player_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Player player;

    @Builder.Default
    private int gamesPlayed = 0;

    @Builder.Default
    private int wins = 0;

    @Builder.Default
    private int losses = 0;

    @Builder.Default
    private int draws = 0;

    @Builder.Default
    private int totalPointsScored = 0;

    @Builder.Default
    private int totalPointsConceded = 0;

    @Builder.Default
    private int longestWinStreak = 0;

    @Builder.Default
    private int currentWinStreak = 0;

    @Builder.Default
    private int eloRating = 1000;

    public double getWinRate() {
        return gamesPlayed == 0 ? 0.0 : (double) wins / gamesPlayed;
    }
}
