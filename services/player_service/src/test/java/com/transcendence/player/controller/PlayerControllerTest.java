package com.transcendence.player.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.transcendence.player.dto.PaginationResponse;
import com.transcendence.player.dto.PlayerListResponse;
import com.transcendence.player.dto.PlayerResponse;
import com.transcendence.player.dto.PublicPlayerResponse;
import com.transcendence.player.entity.PlayerStatus;
import com.transcendence.player.security.GatewayAuthenticationFilter;
import com.transcendence.player.security.SecurityConfig;
import com.transcendence.player.service.PlayerService;

@WebMvcTest(PlayerController.class)
@Import({SecurityConfig.class, GatewayAuthenticationFilter.class})
class PlayerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlayerService playerService;

    private static final UUID PLAYER_ID = UUID.randomUUID();

    private PlayerResponse samplePlayerResponse() {
        return PlayerResponse.builder()
                .id(PLAYER_ID)
                .username("testuser")
                .displayName("testuser")
                .email("test@example.com")
                .status(PlayerStatus.offline)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void createPlayer_validRequest_returns201() throws Exception {
        when(playerService.createPlayer(any())).thenReturn(samplePlayerResponse());

        mockMvc.perform(post("/players")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"testuser","email":"test@example.com","password":"password123"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void createPlayer_missingFields_returns400() throws Exception {
        mockMvc.perform(post("/players")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMe_withAuth_returns200() throws Exception {
        when(playerService.getCurrentPlayer(PLAYER_ID)).thenReturn(samplePlayerResponse());

        mockMvc.perform(get("/players/me")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void getMe_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/players/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listPlayers_withAuth_returns200() throws Exception {
        PlayerListResponse response = PlayerListResponse.builder()
                .players(List.of())
                .pagination(PaginationResponse.builder()
                        .page(1).limit(20).total(0).totalPages(0)
                        .hasNext(false).hasPrevious(false).build())
                .build();
        when(playerService.listPlayers(any(), eq(1), eq(20))).thenReturn(response);

        mockMvc.perform(get("/players")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players").isArray());
    }

    @Test
    void getPlayerById_withAuth_returns200() throws Exception {
        UUID targetId = UUID.randomUUID();
        PublicPlayerResponse pub = PublicPlayerResponse.builder()
                .id(targetId).username("other").displayName("other")
                .status(PlayerStatus.offline).build();
        when(playerService.getPlayerById(targetId)).thenReturn(pub);

        mockMvc.perform(get("/players/" + targetId)
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("other"));
    }

    @Test
    void updateMe_withAuth_returns200() throws Exception {
        when(playerService.updateCurrentPlayer(eq(PLAYER_ID), any())).thenReturn(samplePlayerResponse());

        mockMvc.perform(patch("/players/me")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"New Name"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void deleteMe_withAuth_returns204() throws Exception {
        mockMvc.perform(delete("/players/me")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isNoContent());

        verify(playerService).deleteCurrentPlayer(PLAYER_ID);
    }

    @Test
    void deleteAvatar_withAuth_returns204() throws Exception {
        mockMvc.perform(delete("/players/me/avatar")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isNoContent());

        verify(playerService).deleteAvatar(PLAYER_ID);
    }
}
