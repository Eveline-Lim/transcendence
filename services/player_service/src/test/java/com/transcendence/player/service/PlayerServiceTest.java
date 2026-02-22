package com.transcendence.player.service;

import com.transcendence.player.AbstractIntegrationTest;
import com.transcendence.player.dto.*;
import com.transcendence.player.entity.Player;
import com.transcendence.player.exception.ConflictException;
import com.transcendence.player.exception.ResourceNotFoundException;
import com.transcendence.player.repository.PlayerRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PlayerServiceTest extends AbstractIntegrationTest {

    @Autowired
    private PlayerService playerService;

    @Autowired
    private PlayerRepository playerRepository;

    private static UUID createdPlayerId;

    @Test
    @Order(1)
    void createPlayer_success() {
        CreatePlayerRequest req = new CreatePlayerRequest();
        req.setUsername("testuser1");
        req.setEmail("test1@example.com");
        req.setPassword("password123");
        req.setDisplayName("Test User 1");

        PlayerResponse response = playerService.createPlayer(req);

        assertThat(response.getId()).isNotNull();
        assertThat(response.getUsername()).isEqualTo("testuser1");
        assertThat(response.getDisplayName()).isEqualTo("Test User 1");
        assertThat(response.getEmail()).isEqualTo("test1@example.com");

        createdPlayerId = response.getId();
    }

    @Test
    @Order(2)
    void createPlayer_duplicateUsername_throwsConflict() {
        CreatePlayerRequest req = new CreatePlayerRequest();
        req.setUsername("testuser1"); // duplicate
        req.setEmail("other@example.com");
        req.setPassword("password123");

        assertThatThrownBy(() -> playerService.createPlayer(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Username already exists");
    }

    @Test
    @Order(3)
    void createPlayer_duplicateEmail_throwsConflict() {
        CreatePlayerRequest req = new CreatePlayerRequest();
        req.setUsername("uniqueuser");
        req.setEmail("test1@example.com"); // duplicate
        req.setPassword("password123");

        assertThatThrownBy(() -> playerService.createPlayer(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already registered");
    }

    @Test
    @Order(4)
    void getCurrentPlayer_success() {
        PlayerResponse response = playerService.getCurrentPlayer(createdPlayerId);

        assertThat(response.getId()).isEqualTo(createdPlayerId);
        assertThat(response.getUsername()).isEqualTo("testuser1");
    }

    @Test
    @Order(5)
    void getCurrentPlayer_notFound_throws() {
        UUID unknown = UUID.randomUUID();
        assertThatThrownBy(() -> playerService.getCurrentPlayer(unknown))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @Order(6)
    void getPlayerById_returnsPublicProfile() {
        PublicPlayerResponse response = playerService.getPlayerById(createdPlayerId);

        assertThat(response.getId()).isEqualTo(createdPlayerId);
        // PublicPlayerResponse intentionally omits email
        assertThat(response.getUsername()).isEqualTo("testuser1");
    }

    @Test
    @Order(7)
    void updateCurrentPlayer_changesDisplayName() {
        UpdatePlayerRequest req = new UpdatePlayerRequest();
        req.setDisplayName("Updated Name");

        PlayerResponse updated = playerService.updateCurrentPlayer(createdPlayerId, req);

        assertThat(updated.getDisplayName()).isEqualTo("Updated Name");
    }

    @Test
    @Order(8)
    void listPlayers_returnsPagedResults() {
        // Create a second player first
        CreatePlayerRequest req = new CreatePlayerRequest();
        req.setUsername("testuser2");
        req.setEmail("test2@example.com");
        req.setPassword("password123");
        playerService.createPlayer(req);

        PlayerListResponse list = playerService.listPlayers(null, 1, 20);
        assertThat(list.getPlayers()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(list.getPagination().getPage()).isEqualTo(1);
    }

    @Test
    @Order(9)
    void listPlayers_withSearch_filtersResults() {
        PlayerListResponse list = playerService.listPlayers("testuser1", 1, 20);
        assertThat(list.getPlayers())
                .anyMatch(p -> p.getUsername().equals("testuser1"));
    }

    @Test
    @Order(10)
    void updateAvatar_setsUrl() {
        String url = playerService.updateAvatar(createdPlayerId, "https://cdn.example.com/avatar.png");
        assertThat(url).isEqualTo("https://cdn.example.com/avatar.png");

        Player player = playerRepository.findById(createdPlayerId).orElseThrow();
        assertThat(player.getAvatarUrl()).isEqualTo("https://cdn.example.com/avatar.png");
    }

    @Test
    @Order(11)
    void deleteAvatar_clearsUrl() {
        playerService.deleteAvatar(createdPlayerId);
        Player player = playerRepository.findById(createdPlayerId).orElseThrow();
        assertThat(player.getAvatarUrl()).isNull();
    }

    @Test
    @Order(12)
    void deleteCurrentPlayer_removesFromDb() {
        // Create a throwaway player
        CreatePlayerRequest req = new CreatePlayerRequest();
        req.setUsername("todelete");
        req.setEmail("delete@example.com");
        req.setPassword("password123");
        UUID id = playerService.createPlayer(req).getId();

        playerService.deleteCurrentPlayer(id);

        assertThat(playerRepository.findById(id)).isEmpty();
    }
}
