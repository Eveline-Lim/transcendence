package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class MatchRecordResponse {
    private UUID id;
    private PublicPlayerResponse opponent;
    private int playerScore;
    private int opponentScore;
    private String result;
    private String gameMode;
    private int duration;
    private Instant playedAt;
}
