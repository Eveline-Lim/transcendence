package com.transcendence.player.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdatePlayerRequest {

    @Size(min = 1, max = 50)
    private String displayName;

    @Email
    private String email;
}
