package com.transcendence.player.controller;

import com.transcendence.player.dto.PlayerPreferencesResponse;
import com.transcendence.player.dto.UpdatePreferencesRequest;
import com.transcendence.player.service.PreferencesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/players/me/preferences")
@RequiredArgsConstructor
public class PreferencesController {

    private final PreferencesService preferencesService;

    // GET /players/me/preferences
    @GetMapping
    public ResponseEntity<PlayerPreferencesResponse> getPreferences(
            @AuthenticationPrincipal UUID playerId) {
        return ResponseEntity.ok(preferencesService.getPreferences(playerId));
    }

    // PATCH /players/me/preferences
    @PatchMapping
    public ResponseEntity<PlayerPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal UUID playerId,
            @Valid @RequestBody UpdatePreferencesRequest req) {
        return ResponseEntity.ok(preferencesService.updatePreferences(playerId, req));
    }
}
