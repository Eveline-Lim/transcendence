package com.transcendence.player.service;

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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private final PlayerStatisticsRepository statisticsRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final PlayerService playerService;
    private final PlayerMapper mapper;

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
