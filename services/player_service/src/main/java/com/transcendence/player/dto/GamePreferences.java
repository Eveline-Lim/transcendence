package com.transcendence.player.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GamePreferences {

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String paddleColor;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String ballColor;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String tableColor;

    private Boolean showFps;
    private Boolean enablePowerUps;
}
