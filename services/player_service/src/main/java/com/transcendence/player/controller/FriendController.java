package com.transcendence.player.controller;

import com.transcendence.player.dto.*;
import com.transcendence.player.service.FriendService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/players/me")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    // GET /players/me/friends
    @GetMapping("/friends")
    public ResponseEntity<FriendListResponse> listFriends(
            @AuthenticationPrincipal UUID playerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(friendService.listFriends(playerId, page, limit));
    }

    // GET /players/me/friends/requests
    @GetMapping("/friends/requests")
    public ResponseEntity<FriendRequestListResponse> listFriendRequests(
            @AuthenticationPrincipal UUID playerId,
            @RequestParam(required = false) String direction) {
        return ResponseEntity.ok(friendService.listFriendRequests(playerId, direction));
    }

    // POST /players/me/friends/requests
    @PostMapping("/friends/requests")
    public ResponseEntity<FriendRequestResponse> sendFriendRequest(
            @AuthenticationPrincipal UUID playerId,
            @Valid @RequestBody SendFriendRequestDto req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(friendService.sendFriendRequest(playerId, req.getTargetPlayerId()));
    }

    // PATCH /players/me/friends/requests/{requestId}
    @PatchMapping("/friends/requests/{requestId}")
    public ResponseEntity<FriendRequestResponse> respondToRequest(
            @AuthenticationPrincipal UUID playerId,
            @PathVariable UUID requestId,
            @Valid @RequestBody FriendRequestActionDto req) {
        return ResponseEntity.ok(friendService.respondToFriendRequest(playerId, requestId, req.getAction()));
    }

    // DELETE /players/me/friends/requests/{requestId}
    @DeleteMapping("/friends/requests/{requestId}")
    public ResponseEntity<Void> cancelFriendRequest(
            @AuthenticationPrincipal UUID playerId,
            @PathVariable UUID requestId) {
        friendService.cancelFriendRequest(playerId, requestId);
        return ResponseEntity.noContent().build();
    }

    // DELETE /players/me/friends/{friendId}
    @DeleteMapping("/friends/{friendId}")
    public ResponseEntity<Void> removeFriend(
            @AuthenticationPrincipal UUID playerId,
            @PathVariable UUID friendId) {
        friendService.removeFriend(playerId, friendId);
        return ResponseEntity.noContent().build();
    }

    // GET /players/me/blocked
    @GetMapping("/blocked")
    public ResponseEntity<Map<String, List<PublicPlayerResponse>>> listBlocked(
            @AuthenticationPrincipal UUID playerId) {
        return ResponseEntity.ok(Map.of("blocked", friendService.listBlocked(playerId)));
    }

    // POST /players/me/blocked
    @PostMapping("/blocked")
    public ResponseEntity<Void> blockPlayer(
            @AuthenticationPrincipal UUID playerId,
            @Valid @RequestBody BlockPlayerRequest req) {
        friendService.blockPlayer(playerId, req.getPlayerId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // DELETE /players/me/blocked/{playerId}
    @DeleteMapping("/blocked/{targetId}")
    public ResponseEntity<Void> unblockPlayer(
            @AuthenticationPrincipal UUID playerId,
            @PathVariable UUID targetId) {
        friendService.unblockPlayer(playerId, targetId);
        return ResponseEntity.noContent().build();
    }
}
