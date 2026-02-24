package com.transcendence.player.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.transcendence.player.config.AvatarProperties;
import com.transcendence.player.dto.CreatePlayerRequest;
import com.transcendence.player.dto.PlayerListResponse;
import com.transcendence.player.dto.PlayerResponse;
import com.transcendence.player.dto.PublicPlayerResponse;
import com.transcendence.player.dto.UpdatePlayerRequest;
import com.transcendence.player.service.PlayerService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;
    private final AvatarProperties avatarProperties;

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
            @RequestParam("avatar") MultipartFile file) throws IOException {

        // Sanitize: extract only the file extension from the original filename
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
            if (!extension.matches("\\.(jpg|jpeg|png|gif|webp)")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid file type"));
            }
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing file extension"));
        }

        // Read file bytes once (Spring already buffered the multipart upload)
        byte[] fileBytes = file.getBytes();

        // Verify actual file content via magic-number sniffing — independent of filename
        if (!isAllowedImageType(fileBytes)) {
            return ResponseEntity.badRequest().body(Map.of("error", "File content is not a supported image"));
        }

        // Generate safe filename using only playerId + extension
        String safeFilename = playerId.toString() + extension;

        // Ensure upload directory exists
        Path uploadPath = Path.of(avatarProperties.getUploadDir());
        Files.createDirectories(uploadPath);

        // Resolve and verify the target path doesn't escape the upload directory
        Path targetPath = uploadPath.resolve(safeFilename).normalize();
        if (!targetPath.startsWith(uploadPath.normalize())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid filename"));
        }

        // Write the file to disk
        Files.write(targetPath, fileBytes);

        // Save URL reference in database
        String avatarUrl = avatarProperties.getBaseUrl() + "/" + safeFilename;
        String saved = playerService.updateAvatar(playerId, avatarUrl);
        return ResponseEntity.ok(Map.of("avatarUrl", saved));
    }

    private boolean isAllowedImageType(byte[] bytes) {
        if (bytes.length < 4) return false;
        // JPEG: FF D8 FF
        if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) return true;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length >= 8
                && bytes[0] == (byte) 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) return true;
        // GIF: GIF8
        if (bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') return true;
        // WebP: RIFF????WEBP
        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') return true;
        return false;
    }

    // DELETE /players/me/avatar
    @DeleteMapping("/players/me/avatar")
    public ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal UUID playerId) {
        playerService.deleteAvatar(playerId);
        return ResponseEntity.noContent().build();
    }
}
