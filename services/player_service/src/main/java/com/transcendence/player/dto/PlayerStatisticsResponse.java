package com.transcendence.player.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerStatisticsResponse {
    private UUID playerId;
    private int gamesPlayed;
    private int wins;
    private int losses;
    private int draws;
    private double winRate;
    private int totalPointsScored;
    private int totalPointsConceded;
    private int longestWinStreak;
    private int currentWinStreak;
    private int eloRating;
    private Integer rank;
}
