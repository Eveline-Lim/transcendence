package com.transcendence.player.dto;

import java.time.Instant;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendResponse {
    private UUID id;
    private PublicPlayerResponse player;
    private Instant friendsSince;
}
