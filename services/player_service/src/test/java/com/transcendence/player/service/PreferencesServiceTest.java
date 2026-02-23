package com.transcendence.player.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

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
import com.transcendence.player.dto.GamePreferences;
import com.transcendence.player.dto.NotificationPreferences;
import com.transcendence.player.dto.PlayerPreferencesResponse;
import com.transcendence.player.dto.PrivacyPreferences;
import com.transcendence.player.dto.UpdatePreferencesRequest;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PreferencesServiceTest extends AbstractIntegrationTest {

    @Autowired
    private PreferencesService preferencesService;

    @Autowired
    private PlayerService playerService;

    private static UUID playerId;

    @BeforeAll
    static void createPlayer(@Autowired PlayerService ps) {
        CreatePlayerRequest req = new CreatePlayerRequest();
        req.setUsername("prefs_user");
        req.setEmail("prefs@example.com");
        req.setPassword("password123");
        playerId = ps.createPlayer(req).getId();
    }

    @Test
    @Order(1)
    void getPreferences_returnsDefaults() {
        PlayerPreferencesResponse prefs = preferencesService.getPreferences(playerId);

        assertThat(prefs.getTheme()).isEqualTo("system");
        assertThat(prefs.getLanguage()).isEqualTo("en");
        assertThat(prefs.isSoundEnabled()).isTrue();
        assertThat(prefs.isMusicEnabled()).isTrue();
        assertThat(prefs.getSoundVolume()).isEqualTo(80);
        assertThat(prefs.getMusicVolume()).isEqualTo(50);
        assertThat(prefs.getNotifications().getFriendRequests()).isTrue();
        assertThat(prefs.getNotifications().getGameInvites()).isTrue();
        assertThat(prefs.getNotifications().getTournamentUpdates()).isFalse();
        assertThat(prefs.getGameSettings().getPaddleColor()).isEqualTo("#FFFFFF");
        assertThat(prefs.getGameSettings().getBallColor()).isEqualTo("#FFFFFF");
        assertThat(prefs.getGameSettings().getTableColor()).isEqualTo("#000000");
        assertThat(prefs.getGameSettings().getShowFps()).isFalse();
        assertThat(prefs.getGameSettings().getEnablePowerUps()).isTrue();
        assertThat(prefs.getPrivacy().getShowOnlineStatus()).isTrue();
        assertThat(prefs.getPrivacy().getAllowFriendRequests()).isTrue();
        assertThat(prefs.getPrivacy().getShowMatchHistory()).isTrue();
        assertThat(prefs.getPrivacy().getShowStatistics()).isTrue();
    }

    @Test
    @Order(2)
    void updatePreferences_theme_andLanguage() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setTheme("dark");
        req.setLanguage("fr");

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.getTheme()).isEqualTo("dark");
        assertThat(updated.getLanguage()).isEqualTo("fr");
        // Others unchanged
        assertThat(updated.isSoundEnabled()).isTrue();
    }

    @Test
    @Order(3)
    void updatePreferences_sound_settings() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setSoundEnabled(false);
        req.setSoundVolume(40);
        req.setMusicVolume(30);

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.isSoundEnabled()).isFalse();
        assertThat(updated.getSoundVolume()).isEqualTo(40);
        assertThat(updated.getMusicVolume()).isEqualTo(30);
    }

    @Test
    @Order(4)
    void updatePreferences_gameSettings() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setGameSettings(GamePreferences.builder()
                .paddleColor("#FF0000").ballColor("#00FF00").tableColor("#0000FF")
                .showFps(true).enablePowerUps(false)
                .build());

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.getGameSettings().getPaddleColor()).isEqualTo("#FF0000");
        assertThat(updated.getGameSettings().getBallColor()).isEqualTo("#00FF00");
        assertThat(updated.getGameSettings().getTableColor()).isEqualTo("#0000FF");
        assertThat(updated.getGameSettings().getShowFps()).isTrue();
        assertThat(updated.getGameSettings().getEnablePowerUps()).isFalse();
    }

    @Test
    @Order(5)
    void updatePreferences_notifications() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setNotifications(NotificationPreferences.builder()
                .friendRequests(false).gameInvites(false).tournamentUpdates(true)
                .build());

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.getNotifications().getFriendRequests()).isFalse();
        assertThat(updated.getNotifications().getGameInvites()).isFalse();
        assertThat(updated.getNotifications().getTournamentUpdates()).isTrue();
    }

    @Test
    @Order(6)
    void updatePreferences_privacy() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setPrivacy(PrivacyPreferences.builder()
                .showOnlineStatus(false).allowFriendRequests(false)
                .showMatchHistory(false).showStatistics(false)
                .build());

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.getPrivacy().getShowOnlineStatus()).isFalse();
        assertThat(updated.getPrivacy().getAllowFriendRequests()).isFalse();
        assertThat(updated.getPrivacy().getShowMatchHistory()).isFalse();
        assertThat(updated.getPrivacy().getShowStatistics()).isFalse();
    }

    @Test
    @Order(7)
    void updatePreferences_partialUpdate_doesNotReset() {
        // Only update theme — previous changes should persist
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setTheme("light");

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.getTheme()).isEqualTo("light");
        assertThat(updated.getLanguage()).isEqualTo("fr"); // from order 2
        assertThat(updated.getSoundVolume()).isEqualTo(40); // from order 3
        assertThat(updated.getGameSettings().getPaddleColor()).isEqualTo("#FF0000"); // from order 4
    }
}
