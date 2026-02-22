package com.transcendence.player.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SendFriendRequestDto {

    @NotNull
    private UUID targetPlayerId;
}
