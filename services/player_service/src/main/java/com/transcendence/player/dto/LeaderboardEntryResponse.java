package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LeaderboardEntryResponse {
    private int rank;
    private PublicPlayerResponse player;
    private int eloRating;
    private int wins;
    private int losses;
    private double winRate;
}
