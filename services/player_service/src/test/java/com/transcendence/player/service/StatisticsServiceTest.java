package com.transcendence.player.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.transcendence.player.AbstractIntegrationTest;
import com.transcendence.player.dto.CreatePlayerRequest;
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
import com.transcendence.player.repository.MatchRecordRepository;
import com.transcendence.player.repository.PlayerRepository;
import com.transcendence.player.repository.PlayerStatisticsRepository;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StatisticsServiceTest extends AbstractIntegrationTest {

    @Autowired
    private StatisticsService statisticsService;

    @Autowired
    private PlayerService playerService;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private PlayerStatisticsRepository statisticsRepository;

    @Autowired
    private MatchRecordRepository matchRecordRepository;

    private static java.util.UUID stats1Id;
    private static java.util.UUID stats2Id;

    @BeforeAll
    static void createPlayers(@Autowired PlayerService ps,
            @Autowired PlayerStatisticsRepository sr,
            @Autowired PlayerRepository pr,
            @Autowired MatchRecordRepository mr) {
        CreatePlayerRequest r1 = new CreatePlayerRequest();
        r1.setUsername("stats_p1");
        r1.setEmail("stats_p1@example.com");
        r1.setPassword("password123");
        stats1Id = ps.createPlayer(r1).getId();

        CreatePlayerRequest r2 = new CreatePlayerRequest();
        r2.setUsername("stats_p2");
        r2.setEmail("stats_p2@example.com");
        r2.setPassword("password123");
        stats2Id = ps.createPlayer(r2).getId();

        // Set p1 higher ELO
        Player p1 = pr.findById(stats1Id).orElseThrow();
        Player p2 = pr.findById(stats2Id).orElseThrow();
        PlayerStatistics s1 = sr.findByPlayer(p1).orElseThrow();
        s1.setEloRating(1800);
        s1.setWins(10);
        s1.setLosses(2);
        s1.setGamesPlayed(12);
        sr.save(s1);

        // Add some match records for p1
        MatchRecord m1 = MatchRecord.builder()
                .player(p1).opponent(p2)
                .playerScore(11).opponentScore(5)
                .result(MatchResult.win).gameMode(GameMode.ranked)
                .duration(300).playedAt(Instant.now().minusSeconds(3600))
                .build();
        MatchRecord m2 = MatchRecord.builder()
                .player(p1).opponent(p2)
                .playerScore(5).opponentScore(11)
                .result(MatchResult.loss).gameMode(GameMode.casual)
                .duration(280).playedAt(Instant.now().minusSeconds(7200))
                .build();
        mr.save(m1);
        mr.save(m2);
    }

    @Test
    @Order(1)
    void getPlayerStats_returnsStats() {
        PlayerStatisticsResponse stats = statisticsService.getPlayerStats(stats1Id);

        assertThat(stats.getPlayerId()).isEqualTo(stats1Id);
        assertThat(stats.getEloRating()).isEqualTo(1800);
        assertThat(stats.getWins()).isEqualTo(10);
        assertThat(stats.getLosses()).isEqualTo(2);
        assertThat(stats.getGamesPlayed()).isEqualTo(12);
    }

    @Test
    @Order(2)
    void getMatchHistory_noFilter_returnsBothMatches() {
        MatchHistoryResponse history = statisticsService.getMatchHistory(stats1Id, 1, 20, null, null);

        assertThat(history.getMatches()).hasSize(2);
    }

    @Test
    @Order(3)
    void getMatchHistory_filterByResult_win() {
        MatchHistoryResponse history = statisticsService.getMatchHistory(stats1Id, 1, 20, "win", null);

        assertThat(history.getMatches()).hasSize(1);
        assertThat(history.getMatches().get(0).getResult()).isEqualTo("win");
    }

    @Test
    @Order(4)
    void getMatchHistory_filterByGameMode_casual() {
        MatchHistoryResponse history = statisticsService.getMatchHistory(stats1Id, 1, 20, null, "casual");

        assertThat(history.getMatches()).hasSize(1);
        assertThat(history.getMatches().get(0).getGameMode()).isEqualTo("casual");
    }

    @Test
    @Order(5)
    void getMatchHistory_filterByResultAndGameMode() {
        MatchHistoryResponse history = statisticsService.getMatchHistory(stats1Id, 1, 20, "win", "ranked");
        assertThat(history.getMatches()).hasSize(1);
    }

    @Test
    @Order(6)
    void getGlobalRankings_orderedByElo() {
        RankingsResponse rankings = statisticsService.getGlobalRankings(1, 20, "all_time");

        assertThat(rankings.getRankings()).isNotEmpty();
        // First entry should have highest ELO (1800)
        assertThat(rankings.getRankings().get(0).getEloRating()).isGreaterThanOrEqualTo(1000);
        // Verify ordered descending
        var list = rankings.getRankings();
        for (int i = 0; i < list.size() - 1; i++) {
            assertThat(list.get(i).getEloRating()).isGreaterThanOrEqualTo(list.get(i + 1).getEloRating());
        }
    }

    @Test
    @Order(7)
    void getLeaderboard_returnsPaginatedEntries() {
        LeaderboardResponse leaderboard = statisticsService.getLeaderboard(1, 10, "all_time", "elo");

        assertThat(leaderboard.getEntries()).isNotEmpty();
        assertThat(leaderboard.getPagination().getPage()).isEqualTo(1);
    }

    @Test
    @Order(8)
    void getPlayerRanking_returnsRankInfo() {
        PlayerRankingResponse ranking = statisticsService.getPlayerRanking(stats1Id);

        assertThat(ranking.getPlayerId()).isEqualTo(stats1Id);
        assertThat(ranking.getEloRating()).isEqualTo(1800);
    }

    @Test
    @Order(9)
    void getMatchHistory_pagination_works() {
        MatchHistoryResponse page1 = statisticsService.getMatchHistory(stats1Id, 1, 1, null, null);
        assertThat(page1.getMatches()).hasSize(1);
        assertThat(page1.getPagination().getTotal()).isEqualTo(2);
        assertThat(page1.getPagination().isHasNext()).isTrue();

        MatchHistoryResponse page2 = statisticsService.getMatchHistory(stats1Id, 2, 1, null, null);
        assertThat(page2.getMatches()).hasSize(1);
        assertThat(page2.getPagination().isHasNext()).isFalse();
    }
}
