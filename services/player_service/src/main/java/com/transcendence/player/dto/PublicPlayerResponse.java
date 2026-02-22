package com.transcendence.player.dto;

import com.transcendence.player.entity.PlayerStatus;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PublicPlayerResponse {
    private UUID id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private PlayerStatus status;
}
