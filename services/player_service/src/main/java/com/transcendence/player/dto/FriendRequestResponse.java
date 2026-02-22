package com.transcendence.player.dto;

import com.transcendence.player.entity.FriendRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FriendRequestResponse {
    private UUID id;
    private PublicPlayerResponse fromPlayer;
    private PublicPlayerResponse toPlayer;
    private FriendRequestStatus status;
    private Instant createdAt;
}
