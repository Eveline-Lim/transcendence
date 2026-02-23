package com.transcendence.player.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.transcendence.player.dto.LeaderboardResponse;
import com.transcendence.player.dto.MatchHistoryResponse;
import com.transcendence.player.dto.PaginationResponse;
import com.transcendence.player.dto.PlayerRankingResponse;
import com.transcendence.player.dto.PlayerStatisticsResponse;
import com.transcendence.player.dto.RankingsResponse;
import com.transcendence.player.security.GatewayAuthenticationFilter;
import com.transcendence.player.security.SecurityConfig;
import com.transcendence.player.service.StatisticsService;

@WebMvcTest(StatisticsController.class)
@Import({SecurityConfig.class, GatewayAuthenticationFilter.class})
class StatisticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatisticsService statisticsService;

    private static final UUID PLAYER_ID = UUID.randomUUID();

    private PaginationResponse emptyPagination() {
        return PaginationResponse.builder()
                .page(1).limit(20).total(0).totalPages(0)
                .hasNext(false).hasPrevious(false).build();
    }

    @Test
    void getCurrentPlayerStats_withAuth_returns200() throws Exception {
        PlayerStatisticsResponse stats = PlayerStatisticsResponse.builder()
                .playerId(PLAYER_ID).gamesPlayed(10).wins(7).losses(3)
                .eloRating(1500).winRate(0.7).build();
        when(statisticsService.getPlayerStats(PLAYER_ID)).thenReturn(stats);

        mockMvc.perform(get("/players/me/statistics")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eloRating").value(1500));
    }

    @Test
    void getCurrentPlayerStats_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/players/me/statistics"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPlayerStats_byId_returns200() throws Exception {
        UUID targetId = UUID.randomUUID();
        PlayerStatisticsResponse stats = PlayerStatisticsResponse.builder()
                .playerId(targetId).gamesPlayed(5).wins(2).losses(3)
                .eloRating(1200).winRate(0.4).build();
        when(statisticsService.getPlayerStats(targetId)).thenReturn(stats);

        mockMvc.perform(get("/players/" + targetId + "/statistics")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerId").value(targetId.toString()));
    }

    @Test
    void getMatchHistory_withAuth_returns200() throws Exception {
        MatchHistoryResponse history = MatchHistoryResponse.builder()
                .matches(List.of())
                .pagination(emptyPagination())
                .build();
        when(statisticsService.getMatchHistory(eq(PLAYER_ID), eq(1), eq(20), any(), any()))
                .thenReturn(history);

        mockMvc.perform(get("/players/me/match-history")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches").isArray());
    }

    @Test
    void getMatchHistory_withFilters_returns200() throws Exception {
        MatchHistoryResponse history = MatchHistoryResponse.builder()
                .matches(List.of())
                .pagination(emptyPagination())
                .build();
        when(statisticsService.getMatchHistory(eq(PLAYER_ID), eq(1), eq(20), eq("win"), eq("ranked")))
                .thenReturn(history);

        mockMvc.perform(get("/players/me/match-history")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .param("result", "win")
                        .param("gameMode", "ranked"))
                .andExpect(status().isOk());
    }

    @Test
    void getGlobalRankings_noAuth_returns200() throws Exception {
        RankingsResponse rankings = RankingsResponse.builder()
                .rankings(List.of())
                .pagination(emptyPagination())
                .build();
        when(statisticsService.getGlobalRankings(1, 20, "all_time")).thenReturn(rankings);

        mockMvc.perform(get("/rankings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rankings").isArray());
    }

    @Test
    void getGlobalRankings_withPeriod_returns200() throws Exception {
        RankingsResponse rankings = RankingsResponse.builder()
                .rankings(List.of())
                .pagination(emptyPagination())
                .build();
        when(statisticsService.getGlobalRankings(1, 20, "monthly")).thenReturn(rankings);

        mockMvc.perform(get("/rankings")
                        .param("period", "monthly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rankings").isArray());
    }

    @Test
    void getLeaderboard_noAuth_returns200() throws Exception {
        LeaderboardResponse leaderboard = LeaderboardResponse.builder()
                .entries(List.of())
                .pagination(emptyPagination())
                .build();
        when(statisticsService.getLeaderboard(1, 10, "all_time", "elo")).thenReturn(leaderboard);

        mockMvc.perform(get("/leaderboard")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries").isArray());
    }

    @Test
    void getLeaderboard_withCategory_returns200() throws Exception {
        LeaderboardResponse leaderboard = LeaderboardResponse.builder()
                .entries(List.of())
                .pagination(emptyPagination())
                .build();
        when(statisticsService.getLeaderboard(1, 20, "all_time", "wins")).thenReturn(leaderboard);

        mockMvc.perform(get("/leaderboard")
                        .param("category", "wins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries").isArray());
    }

    @Test
    void getCurrentPlayerRanking_withAuth_returns200() throws Exception {
        PlayerRankingResponse ranking = PlayerRankingResponse.builder()
                .rank(1).playerId(PLAYER_ID).username("testuser")
                .eloRating(1800).gamesPlayed(10).wins(8).losses(2)
                .winRate(0.8).build();
        when(statisticsService.getPlayerRanking(PLAYER_ID)).thenReturn(ranking);

        mockMvc.perform(get("/rankings/me")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rank").value(1));
    }

    @Test
    void getCurrentPlayerRanking_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/rankings/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPlayerRanking_byId_returns200() throws Exception {
        UUID targetId = UUID.randomUUID();
        PlayerRankingResponse ranking = PlayerRankingResponse.builder()
                .rank(5).playerId(targetId).username("other")
                .eloRating(1400).gamesPlayed(20).wins(10).losses(10)
                .winRate(0.5).build();
        when(statisticsService.getPlayerRanking(targetId)).thenReturn(ranking);

        mockMvc.perform(get("/rankings/" + targetId)
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rank").value(5));
    }
}
