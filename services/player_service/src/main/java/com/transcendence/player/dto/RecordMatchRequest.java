package com.transcendence.player.dto;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Payload sent by the game service when a match finishes.
 * Used internally — no JWT required.
 */
@Data
public class RecordMatchRequest {

    @NotNull
    private UUID winnerId;

    @NotNull
    private UUID loserId;

    @Min(0)
    private int winnerScore;

    @Min(0)
    private int loserScore;

    /** "casual" | "ranked" */
    @NotNull
    private String gameMode;

    /** Duration in seconds */
    @Min(0)
    private int duration;
}
