package com.transcendence.player.service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendence.player.dto.LeaderboardEntryResponse;
import com.transcendence.player.dto.LeaderboardResponse;
import com.transcendence.player.dto.MatchHistoryResponse;
import com.transcendence.player.dto.PlayerRankingResponse;
import com.transcendence.player.dto.PlayerStatisticsResponse;
import com.transcendence.player.dto.RecordMatchRequest;
import com.transcendence.player.dto.RankingsResponse;
import com.transcendence.player.entity.GameMode;
import com.transcendence.player.entity.MatchRecord;
import com.transcendence.player.entity.MatchResult;
import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerStatistics;
import com.transcendence.player.exception.ResourceNotFoundException;
import com.transcendence.player.mapper.PlayerMapper;
import com.transcendence.player.repository.MatchRecordRepository;
import com.transcendence.player.repository.PlayerStatisticsRepository;
import com.transcendence.player.util.PaginationUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private final PlayerStatisticsRepository statisticsRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final PlayerService playerService;
    private final PlayerMapper mapper;

    // ── K-factor for ELO calculation ──────────────────────────────────────────
    private static final int ELO_K = 32;

    /**
     * Record a completed match: creates MatchRecord rows for both players and
     * updates their PlayerStatistics (wins, losses, ELO, streaks, etc.).
     */
    @Transactional
    public void recordMatch(RecordMatchRequest req) {
        GameMode mode = GameMode.valueOf(req.getGameMode());
        Player winner = playerService.findById(req.getWinnerId());
        Player loser  = playerService.findById(req.getLoserId());
        Instant now   = Instant.now();

        // ── Match records (one per player perspective) ────────────────────────
        matchRecordRepository.save(MatchRecord.builder()
                .player(winner).opponent(loser)
                .playerScore(req.getWinnerScore()).opponentScore(req.getLoserScore())
                .result(MatchResult.win).gameMode(mode)
                .duration(req.getDuration()).playedAt(now)
                .build());

        matchRecordRepository.save(MatchRecord.builder()
                .player(loser).opponent(winner)
                .playerScore(req.getLoserScore()).opponentScore(req.getWinnerScore())
                .result(MatchResult.loss).gameMode(mode)
                .duration(req.getDuration()).playedAt(now)
                .build());

        // ── Player statistics ─────────────────────────────────────────────────
        PlayerStatistics winnerStats = statisticsRepository.findByPlayer(winner)
                .orElseThrow(() -> new ResourceNotFoundException("Winner statistics not found"));
        PlayerStatistics loserStats = statisticsRepository.findByPlayer(loser)
                .orElseThrow(() -> new ResourceNotFoundException("Loser statistics not found"));

        // ELO
        int newWinnerElo = computeElo(winnerStats.getEloRating(), loserStats.getEloRating(), true);
        int newLoserElo  = computeElo(loserStats.getEloRating(), winnerStats.getEloRating(), false);

        winnerStats.setGamesPlayed(winnerStats.getGamesPlayed() + 1);
        winnerStats.setWins(winnerStats.getWins() + 1);
        winnerStats.setTotalPointsScored(winnerStats.getTotalPointsScored() + req.getWinnerScore());
        winnerStats.setTotalPointsConceded(winnerStats.getTotalPointsConceded() + req.getLoserScore());
        winnerStats.setCurrentWinStreak(winnerStats.getCurrentWinStreak() + 1);
        winnerStats.setLongestWinStreak(
                Math.max(winnerStats.getLongestWinStreak(), winnerStats.getCurrentWinStreak()));
        winnerStats.setEloRating(newWinnerElo);
        statisticsRepository.save(winnerStats);

        loserStats.setGamesPlayed(loserStats.getGamesPlayed() + 1);
        loserStats.setLosses(loserStats.getLosses() + 1);
        loserStats.setTotalPointsScored(loserStats.getTotalPointsScored() + req.getLoserScore());
        loserStats.setTotalPointsConceded(loserStats.getTotalPointsConceded() + req.getWinnerScore());
        loserStats.setCurrentWinStreak(0);
        loserStats.setEloRating(newLoserElo);
        statisticsRepository.save(loserStats);

        log.info("Recorded match: {} beat {} ({}-{}) mode={} elo {}→{} / {}→{}",
                winner.getUsername(), loser.getUsername(),
                req.getWinnerScore(), req.getLoserScore(), mode,
                winnerStats.getEloRating() - (newWinnerElo - winnerStats.getEloRating()), newWinnerElo,
                loserStats.getEloRating() - (newLoserElo - loserStats.getEloRating()), newLoserElo);
    }

    private int computeElo(int playerRating, int opponentRating, boolean won) {
        double expected = 1.0 / (1.0 + Math.pow(10, (opponentRating - playerRating) / 400.0));
        double score = won ? 1.0 : 0.0;
        return (int) Math.round(playerRating + ELO_K * (score - expected));
    }

    public PlayerStatisticsResponse getPlayerStats(UUID playerId) {
        Player player = playerService.findById(playerId);
        PlayerStatistics stats = statisticsRepository.findByPlayer(player)
                .orElseThrow(() -> new ResourceNotFoundException("Statistics not found"));
        return mapper.toStatisticsResponse(stats, null);
    }

    public MatchHistoryResponse getMatchHistory(UUID playerId, int page, int limit,
            MatchResult result, GameMode gameMode) {
        Player player = playerService.findById(playerId);
        PageRequest pageable = PageRequest.of(page - 1, limit, Sort.by("playedAt").descending());
        Page<MatchRecord> records;

        if (result != null && gameMode != null) {
            records = matchRecordRepository.findByPlayerAndResultAndGameMode(player, result, gameMode,
                    pageable);
        } else if (result != null) {
            records = matchRecordRepository.findByPlayerAndResult(player, result, pageable);
        } else if (gameMode != null) {
            records = matchRecordRepository.findByPlayerAndGameMode(player, gameMode, pageable);
        } else {
            records = matchRecordRepository.findByPlayer(player, pageable);
        }

        return MatchHistoryResponse.builder()
                .matches(records.getContent().stream().map(mapper::toMatchRecordResponse).toList())
                .pagination(PaginationUtils.buildPagination(records))
                .build();
    }

    public RankingsResponse getGlobalRankings(int page, int limit, String period) {
        PageRequest pageable = PageRequest.of(page - 1, limit);
        Page<PlayerStatistics> stats = statisticsRepository.findAllByOrderByEloRatingDesc(pageable);

        AtomicInteger rankOffset = new AtomicInteger((page - 1) * limit + 1);
        return RankingsResponse.builder()
                .rankings(stats.getContent().stream()
                        .map(s -> toRankingResponse(s, rankOffset.getAndIncrement()))
                        .toList())
                .pagination(PaginationUtils.buildPagination(stats))
                .build();
    }

    public PlayerRankingResponse getPlayerRanking(UUID playerId) {
        Player player = playerService.findById(playerId);
        PlayerStatistics stats = statisticsRepository.findByPlayer(player)
                .orElseThrow(() -> new ResourceNotFoundException("Statistics not found"));
        // Rank = number of players with higher ELO + 1
        long rank = statisticsRepository.countByEloRatingGreaterThan(stats.getEloRating()) + 1;
        return toRankingResponse(stats, (int) rank);
    }

    public LeaderboardResponse getLeaderboard(int page, int limit, String period, String category) {
        PageRequest pageable = PageRequest.of(page - 1, limit);
        Page<PlayerStatistics> stats = switch (category) {
            case "elo" -> statisticsRepository.findAllByOrderByEloRatingDesc(pageable);
            case "wins" -> statisticsRepository.findAllByOrderByWinsDesc(pageable);
            case "winrate" -> statisticsRepository.findAllByOrderByWinRateDesc(pageable);
            case "games_played" -> statisticsRepository.findAllByOrderByGamesPlayedDesc(pageable);
            default -> throw new IllegalArgumentException("Invalid category: " + category);
        };

        AtomicInteger rankOffset = new AtomicInteger((page - 1) * limit + 1);
        return LeaderboardResponse.builder()
                .entries(stats.getContent().stream()
                        .map(s -> toLeaderboardEntry(s, rankOffset.getAndIncrement()))
                        .toList())
                .pagination(PaginationUtils.buildPagination(stats))
                .build();
    }

    private PlayerRankingResponse toRankingResponse(PlayerStatistics s, int rank) {
        Player p = s.getPlayer();
        return PlayerRankingResponse.builder()
                .rank(rank)
                .playerId(p.getId())
                .username(p.getUsername())
                .displayName(p.getDisplayName())
                .avatarUrl(p.getAvatarUrl())
                .eloRating(s.getEloRating())
                .gamesPlayed(s.getGamesPlayed())
                .wins(s.getWins())
                .losses(s.getLosses())
                .winRate(s.getWinRate())
                .build();
    }

    private LeaderboardEntryResponse toLeaderboardEntry(PlayerStatistics s, int rank) {
        return LeaderboardEntryResponse.builder()
                .rank(rank)
                .player(mapper.toPublicPlayerResponse(s.getPlayer()))
                .eloRating(s.getEloRating())
                .wins(s.getWins())
                .losses(s.getLosses())
                .winRate(s.getWinRate())
                .build();
    }
}
