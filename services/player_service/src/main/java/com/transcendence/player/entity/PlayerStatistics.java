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
