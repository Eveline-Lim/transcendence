package com.transcendence.player.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendFriendRequestDto {

    @NotNull
    private UUID targetPlayerId;
}
