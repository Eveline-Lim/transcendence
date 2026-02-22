package com.transcendence.player.dto;

import java.time.Instant;
import java.util.UUID;

import com.transcendence.player.entity.FriendRequestStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendRequestResponse {
    private UUID id;
    private PublicPlayerResponse fromPlayer;
    private PublicPlayerResponse toPlayer;
    private FriendRequestStatus status;
    private Instant createdAt;
}
