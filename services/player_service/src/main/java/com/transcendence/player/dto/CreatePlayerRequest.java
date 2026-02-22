package com.transcendence.player.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreatePlayerRequest {

    @NotBlank
    @Size(min = 3, max = 20)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$")
    private String username;

    @Size(min = 1, max = 50)
    private String displayName;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, max = 128)
    private String password;
}
