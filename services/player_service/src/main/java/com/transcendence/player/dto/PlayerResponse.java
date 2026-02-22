package com.transcendence.player.dto;

import com.transcendence.player.entity.PlayerStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

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
