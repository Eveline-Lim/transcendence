package com.transcendence.player.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.transcendence.player.dto.LeaderboardResponse;
import com.transcendence.player.dto.MatchHistoryResponse;
import com.transcendence.player.dto.PlayerRankingResponse;
import com.transcendence.player.dto.PlayerStatisticsResponse;
import com.transcendence.player.dto.RankingsResponse;
import com.transcendence.player.entity.GameMode;
import com.transcendence.player.entity.MatchResult;
import com.transcendence.player.service.StatisticsService;

import lombok.RequiredArgsConstructor;

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
            @RequestParam(required = false) MatchResult result,
            @RequestParam(required = false) GameMode gameMode) {
        return ResponseEntity.ok(statisticsService.getMatchHistory(playerId, page, limit, result, gameMode));
    }

    // GET /rankings
    @GetMapping("/rankings")
    public ResponseEntity<RankingsResponse> getGlobalRankings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "all_time") String period) {
        return ResponseEntity.ok(statisticsService.getGlobalRankings(page, limit, period));
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
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "all_time") String period,
            @RequestParam(defaultValue = "elo") String category) {
        return ResponseEntity.ok(statisticsService.getLeaderboard(page, limit, period, category));
    }
}
