package com.transcendence.player.controller;

import com.transcendence.player.dto.*;
import com.transcendence.player.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    // GET /players/me/statistics
    @GetMapping("/players/me/statistics")
    public ResponseEntity<PlayerStatisticsResponse> getCurrentPlayerStats(
            @AuthenticationPrincipal UUID playerId) {
        return ResponseEntity.ok(statisticsService.getPlayerStats(playerId));
    }

    // GET /players/{playerId}/statistics
    @GetMapping("/players/{playerId}/statistics")
    public ResponseEntity<PlayerStatisticsResponse> getPlayerStats(@PathVariable UUID playerId) {
        return ResponseEntity.ok(statisticsService.getPlayerStats(playerId));
    }

    // GET /players/me/match-history
    @GetMapping("/players/me/match-history")
    public ResponseEntity<MatchHistoryResponse> getMatchHistory(
            @AuthenticationPrincipal UUID playerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String gameMode) {
        return ResponseEntity.ok(statisticsService.getMatchHistory(playerId, page, limit, result, gameMode));
    }

    // GET /rankings
    @GetMapping("/rankings")
    public ResponseEntity<RankingsResponse> getGlobalRankings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(statisticsService.getGlobalRankings(page, limit));
    }

    // GET /rankings/me
    @GetMapping("/rankings/me")
    public ResponseEntity<PlayerRankingResponse> getCurrentPlayerRanking(
            @AuthenticationPrincipal UUID playerId) {
        return ResponseEntity.ok(statisticsService.getPlayerRanking(playerId));
    }

    // GET /rankings/{playerId}
    @GetMapping("/rankings/{playerId}")
    public ResponseEntity<PlayerRankingResponse> getPlayerRanking(@PathVariable UUID playerId) {
        return ResponseEntity.ok(statisticsService.getPlayerRanking(playerId));
    }

    // GET /leaderboard
    @GetMapping("/leaderboard")
    public ResponseEntity<LeaderboardResponse> getLeaderboard(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(statisticsService.getLeaderboard(page, limit));
    }
}
