package com.transcendence.player.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class FriendRequestActionDto {

    @NotBlank
    @Pattern(regexp = "^(accept|reject)$")
    private String action;
}
