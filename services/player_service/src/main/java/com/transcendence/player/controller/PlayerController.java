package com.transcendence.player.controller;

import com.transcendence.player.dto.*;
import com.transcendence.player.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    // POST /players - public
    @PostMapping("/players")
    public ResponseEntity<PlayerResponse> createPlayer(@Valid @RequestBody CreatePlayerRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(playerService.createPlayer(req));
    }

    // GET /players
    @GetMapping("/players")
    public ResponseEntity<PlayerListResponse> listPlayers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(playerService.listPlayers(search, page, limit));
    }

    // GET /players/me
    @GetMapping("/players/me")
    public ResponseEntity<PlayerResponse> getMe(@AuthenticationPrincipal UUID playerId) {
        return ResponseEntity.ok(playerService.getCurrentPlayer(playerId));
    }

    // PATCH /players/me
    @PatchMapping("/players/me")
    public ResponseEntity<PlayerResponse> updateMe(
            @AuthenticationPrincipal UUID playerId,
            @Valid @RequestBody UpdatePlayerRequest req) {
        return ResponseEntity.ok(playerService.updateCurrentPlayer(playerId, req));
    }

    // DELETE /players/me
    @DeleteMapping("/players/me")
    public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal UUID playerId) {
        playerService.deleteCurrentPlayer(playerId);
        return ResponseEntity.noContent().build();
    }

    // GET /players/{id}
    @GetMapping("/players/{playerId}")
    public ResponseEntity<PublicPlayerResponse> getPlayerById(@PathVariable UUID playerId) {
        return ResponseEntity.ok(playerService.getPlayerById(playerId));
    }

    // PUT /players/me/avatar
    @PutMapping("/players/me/avatar")
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @AuthenticationPrincipal UUID playerId,
            @RequestParam("avatar") MultipartFile file) {
        // In production: persist file to storage and generate URL
        String avatarUrl = "/uploads/avatars/" + playerId + "_" + file.getOriginalFilename();
        String saved = playerService.updateAvatar(playerId, avatarUrl);
        return ResponseEntity.ok(Map.of("avatarUrl", saved));
    }

    // DELETE /players/me/avatar
    @DeleteMapping("/players/me/avatar")
    public ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal UUID playerId) {
        playerService.deleteAvatar(playerId);
        return ResponseEntity.noContent().build();
    }
}
