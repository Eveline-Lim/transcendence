package com.transcendence.player.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import com.transcendence.player.dto.FriendListResponse;
import com.transcendence.player.dto.FriendRequestListResponse;
import com.transcendence.player.dto.FriendRequestResponse;
import com.transcendence.player.dto.SendFriendRequestDto;
import com.transcendence.player.exception.ConflictException;
import com.transcendence.player.exception.ResourceNotFoundException;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class FriendServiceTest extends AbstractIntegrationTest {

    @Autowired
    private FriendService friendService;

    @Autowired
    private PlayerService playerService;

    private static UUID player1Id;
    private static UUID player2Id;
    private static UUID requestId;

    @BeforeAll
    static void setup(@Autowired PlayerService ps) {
        CreatePlayerRequest r1 = new CreatePlayerRequest();
        r1.setUsername("friend_p1");
        r1.setEmail("friend_p1@example.com");
        r1.setPassword("password123");
        player1Id = ps.createPlayer(r1).getId();

        CreatePlayerRequest r2 = new CreatePlayerRequest();
        r2.setUsername("friend_p2");
        r2.setEmail("friend_p2@example.com");
        r2.setPassword("password123");
        player2Id = ps.createPlayer(r2).getId();
    }

    @Test
    @Order(1)
    void sendFriendRequest_success() {
        SendFriendRequestDto req = new SendFriendRequestDto();
        req.setTargetPlayerId(player2Id);

        FriendRequestResponse response = friendService.sendFriendRequest(player1Id, player2Id);

        assertThat(response.getId()).isNotNull();
        assertThat(response.getFromPlayer().getId()).isEqualTo(player1Id);
        assertThat(response.getToPlayer().getId()).isEqualTo(player2Id);
        assertThat(response.getStatus().name()).isEqualTo("pending");

        requestId = response.getId();
    }

    @Test
    @Order(2)
    void sendFriendRequest_duplicate_throwsConflict() {
        assertThatThrownBy(() -> friendService.sendFriendRequest(player1Id, player2Id))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @Order(3)
    void sendFriendRequest_toSelf_throwsConflict() {
        assertThatThrownBy(() -> friendService.sendFriendRequest(player1Id, player1Id))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @Order(4)
    void listFriendRequests_incoming_returnsPending() {
        FriendRequestListResponse response = friendService.listFriendRequests(player2Id, "incoming");
        assertThat(response.getRequests()).hasSize(1);
        assertThat(response.getRequests().get(0).getId()).isEqualTo(requestId);
    }

    @Test
    @Order(5)
    void listFriendRequests_outgoing_returnsPending() {
        FriendRequestListResponse response = friendService.listFriendRequests(player1Id, "outgoing");
        assertThat(response.getRequests()).hasSize(1);
    }

    @Test
    @Order(6)
    void respondToFriendRequest_accept_createsFriendship() {
        FriendRequestResponse response = friendService.respondToFriendRequest(player2Id, requestId, "accept");

        assertThat(response.getStatus().name()).isEqualTo("accepted");
    }

    @Test
    @Order(7)
    void listFriends_afterAccept_containsBothPlayers() {
        FriendListResponse list1 = friendService.listFriends(player1Id, 1, 20, null);
        FriendListResponse list2 = friendService.listFriends(player2Id, 1, 20, null);

        assertThat(list1.getFriends()).hasSize(1);
        assertThat(list1.getFriends().get(0).getPlayer().getId()).isEqualTo(player2Id);
        assertThat(list2.getFriends()).hasSize(1);
        assertThat(list2.getFriends().get(0).getPlayer().getId()).isEqualTo(player1Id);
    }

    @Test
    @Order(8)
    void blockAndUnblock_player() {
        // Create a third player to block
        CreatePlayerRequest r3 = new CreatePlayerRequest();
        r3.setUsername("friend_p3");
        r3.setEmail("friend_p3@example.com");
        r3.setPassword("password123");
        UUID player3Id = playerService.createPlayer(r3).getId();

        friendService.blockPlayer(player1Id, player3Id);

        var blocked = friendService.listBlocked(player1Id);
        assertThat(blocked).anyMatch(p -> p.getId().equals(player3Id));

        friendService.unblockPlayer(player1Id, player3Id);

        var afterUnblock = friendService.listBlocked(player1Id);
        assertThat(afterUnblock).noneMatch(p -> p.getId().equals(player3Id));
    }

    @Test
    @Order(9)
    void blockPlayer_self_throwsConflict() {
        assertThatThrownBy(() -> friendService.blockPlayer(player1Id, player1Id))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @Order(10)
    void removeFriend_removesFromBothSides() {
        friendService.removeFriend(player1Id, player2Id);

        FriendListResponse list1 = friendService.listFriends(player1Id, 1, 20, null);
        FriendListResponse list2 = friendService.listFriends(player2Id, 1, 20, null);

        assertThat(list1.getFriends()).isEmpty();
        assertThat(list2.getFriends()).isEmpty();
    }

    @Test
    @Order(11)
    void removeFriend_notFriend_throws() {
        assertThatThrownBy(() -> friendService.removeFriend(player1Id, player2Id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @Order(12)
    void cancelFriendRequest_success() {
        // send a new request
        CreatePlayerRequest r4 = new CreatePlayerRequest();
        r4.setUsername("friend_p4");
        r4.setEmail("friend_p4@example.com");
        r4.setPassword("password123");
        UUID player4Id = playerService.createPlayer(r4).getId();

        FriendRequestResponse fr = friendService.sendFriendRequest(player1Id, player4Id);
        friendService.cancelFriendRequest(player1Id, fr.getId());

        FriendRequestListResponse outgoing = friendService.listFriendRequests(player1Id, "outgoing");
        assertThat(outgoing.getRequests()).noneMatch(r -> r.getId().equals(fr.getId()));
    }
}
