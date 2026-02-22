package com.transcendence.player.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerRankingResponse {
    private int rank;
    private UUID playerId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private int eloRating;
    private int gamesPlayed;
    private int wins;
    private int losses;
    private double winRate;
    private Integer rankChange;
}
