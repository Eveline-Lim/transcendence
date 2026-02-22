package com.transcendence.player.dto;

import java.time.Instant;
import java.util.UUID;

import com.transcendence.player.entity.PlayerStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerResponse {
    private UUID id;
    private String username;
    private String displayName;
    private String email;
    private String avatarUrl;
    private PlayerStatus status;
    private Instant createdAt;
    private Instant updatedAt;
}
