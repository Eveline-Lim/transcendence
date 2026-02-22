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
import com.transcendence.player.dto.PlayerPreferencesResponse;
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
        assertThat(prefs.isNotifyFriendRequests()).isTrue();
        assertThat(prefs.isNotifyGameInvites()).isTrue();
        assertThat(prefs.isNotifyTournamentUpdates()).isFalse();
        assertThat(prefs.getPaddleColor()).isEqualTo("#FFFFFF");
        assertThat(prefs.getBallColor()).isEqualTo("#FFFFFF");
        assertThat(prefs.getTableColor()).isEqualTo("#000000");
        assertThat(prefs.isShowFps()).isFalse();
        assertThat(prefs.isEnablePowerUps()).isTrue();
        assertThat(prefs.isShowOnlineStatus()).isTrue();
        assertThat(prefs.isAllowFriendRequests()).isTrue();
        assertThat(prefs.isShowMatchHistory()).isTrue();
        assertThat(prefs.isShowStatistics()).isTrue();
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
        req.setPaddleColor("#FF0000");
        req.setBallColor("#00FF00");
        req.setTableColor("#0000FF");
        req.setShowFps(true);
        req.setEnablePowerUps(false);

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.getPaddleColor()).isEqualTo("#FF0000");
        assertThat(updated.getBallColor()).isEqualTo("#00FF00");
        assertThat(updated.getTableColor()).isEqualTo("#0000FF");
        assertThat(updated.isShowFps()).isTrue();
        assertThat(updated.isEnablePowerUps()).isFalse();
    }

    @Test
    @Order(5)
    void updatePreferences_notifications() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setNotifyFriendRequests(false);
        req.setNotifyGameInvites(false);
        req.setNotifyTournamentUpdates(true);

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.isNotifyFriendRequests()).isFalse();
        assertThat(updated.isNotifyGameInvites()).isFalse();
        assertThat(updated.isNotifyTournamentUpdates()).isTrue();
    }

    @Test
    @Order(6)
    void updatePreferences_privacy() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setShowOnlineStatus(false);
        req.setAllowFriendRequests(false);
        req.setShowMatchHistory(false);
        req.setShowStatistics(false);

        PlayerPreferencesResponse updated = preferencesService.updatePreferences(playerId, req);

        assertThat(updated.isShowOnlineStatus()).isFalse();
        assertThat(updated.isAllowFriendRequests()).isFalse();
        assertThat(updated.isShowMatchHistory()).isFalse();
        assertThat(updated.isShowStatistics()).isFalse();
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
        assertThat(updated.getPaddleColor()).isEqualTo("#FF0000"); // from order 4
    }
}
