package com.transcendence.player.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.transcendence.player.dto.GamePreferences;
import com.transcendence.player.dto.NotificationPreferences;
import com.transcendence.player.dto.PlayerPreferencesResponse;
import com.transcendence.player.dto.PrivacyPreferences;
import com.transcendence.player.security.GatewayAuthenticationFilter;
import com.transcendence.player.security.SecurityConfig;
import com.transcendence.player.service.PreferencesService;

@WebMvcTest(PreferencesController.class)
@Import({SecurityConfig.class, GatewayAuthenticationFilter.class})
class PreferencesControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PreferencesService preferencesService;

    private static final UUID PLAYER_ID = UUID.randomUUID();

    private PlayerPreferencesResponse defaultPreferences() {
        return PlayerPreferencesResponse.builder()
                .theme("system").language("en")
                .soundEnabled(true).musicEnabled(true)
                .soundVolume(80).musicVolume(50)
                .notifications(NotificationPreferences.builder()
                        .friendRequests(true).gameInvites(true).tournamentUpdates(false)
                        .build())
                .gameSettings(GamePreferences.builder()
                        .paddleColor("#FFFFFF").ballColor("#FFFFFF").tableColor("#000000")
                        .showFps(false).enablePowerUps(true)
                        .build())
                .privacy(PrivacyPreferences.builder()
                        .showOnlineStatus(true).allowFriendRequests(true)
                        .showMatchHistory(true).showStatistics(true)
                        .build())
                .build();
    }

    @Test
    void getPreferences_withAuth_returns200() throws Exception {
        when(preferencesService.getPreferences(PLAYER_ID)).thenReturn(defaultPreferences());

        mockMvc.perform(get("/players/me/preferences")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.theme").value("system"))
                .andExpect(jsonPath("$.language").value("en"))
                .andExpect(jsonPath("$.notifications.friendRequests").value(true))
                .andExpect(jsonPath("$.gameSettings.paddleColor").value("#FFFFFF"))
                .andExpect(jsonPath("$.privacy.showOnlineStatus").value(true));
    }

    @Test
    void getPreferences_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/players/me/preferences"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updatePreferences_validRequest_returns200() throws Exception {
        PlayerPreferencesResponse updated = defaultPreferences();
        updated.setTheme("dark");
        when(preferencesService.updatePreferences(eq(PLAYER_ID), any())).thenReturn(updated);

        mockMvc.perform(patch("/players/me/preferences")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"theme":"dark"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.theme").value("dark"));
    }

    @Test
    void updatePreferences_invalidTheme_returns400() throws Exception {
        mockMvc.perform(patch("/players/me/preferences")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"theme":"invalid_theme"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePreferences_invalidColor_returns400() throws Exception {
        mockMvc.perform(patch("/players/me/preferences")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"gameSettings":{"paddleColor":"not-a-color"}}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePreferences_validColor_returns200() throws Exception {
        PlayerPreferencesResponse updated = defaultPreferences();
        updated.getGameSettings().setPaddleColor("#FF0000");
        when(preferencesService.updatePreferences(eq(PLAYER_ID), any())).thenReturn(updated);

        mockMvc.perform(patch("/players/me/preferences")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"gameSettings":{"paddleColor":"#FF0000"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameSettings.paddleColor").value("#FF0000"));
    }

    @Test
    void updatePreferences_withoutAuth_returns403() throws Exception {
        mockMvc.perform(patch("/players/me/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"theme":"dark"}
                                """))
                .andExpect(status().isForbidden());
    }
}
