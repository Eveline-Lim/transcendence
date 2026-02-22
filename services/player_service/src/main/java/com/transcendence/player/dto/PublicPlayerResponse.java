package com.transcendence.player.dto;

import java.util.UUID;

import com.transcendence.player.entity.PlayerStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PublicPlayerResponse {
    private UUID id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private PlayerStatus status;
}
