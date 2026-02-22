package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FriendResponse {
    private UUID id;
    private PublicPlayerResponse player;
    private Instant friendsSince;
}
