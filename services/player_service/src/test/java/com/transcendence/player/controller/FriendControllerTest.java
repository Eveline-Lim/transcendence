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

import com.transcendence.player.config.AvatarProperties;
import com.transcendence.player.dto.FriendListResponse;
import com.transcendence.player.dto.FriendRequestListResponse;
import com.transcendence.player.dto.FriendRequestResponse;
import com.transcendence.player.dto.FriendResponse;
import com.transcendence.player.dto.PaginationResponse;
import com.transcendence.player.dto.PublicPlayerResponse;
import com.transcendence.player.entity.FriendRequestStatus;
import com.transcendence.player.entity.PlayerStatus;
import com.transcendence.player.security.GatewayAuthenticationFilter;
import com.transcendence.player.security.SecurityConfig;
import com.transcendence.player.service.FriendService;

@WebMvcTest(FriendController.class)
@Import({SecurityConfig.class, GatewayAuthenticationFilter.class})
class FriendControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FriendService friendService;

    @MockBean
    private AvatarProperties avatarProperties;

    private static final UUID PLAYER_ID = UUID.randomUUID();
    private static final UUID FRIEND_ID = UUID.randomUUID();

    private PublicPlayerResponse samplePublicPlayer(UUID id, String username) {
        return PublicPlayerResponse.builder()
                .id(id).username(username).displayName(username)
                .status(PlayerStatus.offline).build();
    }

    @Test
    void listFriends_withAuth_returns200() throws Exception {
        FriendListResponse response = FriendListResponse.builder()
                .friends(List.of(FriendResponse.builder()
                        .id(UUID.randomUUID())
                        .player(samplePublicPlayer(FRIEND_ID, "friend"))
                        .friendsSince(Instant.now())
                        .build()))
                .pagination(PaginationResponse.builder()
                        .page(1).limit(20).total(1).totalPages(1)
                        .hasNext(false).hasPrevious(false).build())
                .build();
        when(friendService.listFriends(eq(PLAYER_ID), eq(1), eq(20), any())).thenReturn(response);

        mockMvc.perform(get("/players/me/friends")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.friends").isArray())
                .andExpect(jsonPath("$.friends[0].player.username").value("friend"));
    }

    @Test
    void listFriends_withStatusFilter_returns200() throws Exception {
        FriendListResponse response = FriendListResponse.builder()
                .friends(List.of())
                .pagination(PaginationResponse.builder()
                        .page(1).limit(20).total(0).totalPages(0)
                        .hasNext(false).hasPrevious(false).build())
                .build();
        when(friendService.listFriends(eq(PLAYER_ID), eq(1), eq(20), eq("online"))).thenReturn(response);

        mockMvc.perform(get("/players/me/friends")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .param("status", "online"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.friends").isArray());
    }

    @Test
    void listFriends_withoutAuth_returns403() throws Exception {
        mockMvc.perform(get("/players/me/friends"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listFriendRequests_withAuth_returns200() throws Exception {
        when(friendService.listFriendRequests(PLAYER_ID, "incoming"))
                .thenReturn(FriendRequestListResponse.builder().requests(List.of()).build());

        mockMvc.perform(get("/players/me/friends/requests")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .param("direction", "incoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requests").isArray());
    }

    @Test
    void sendFriendRequest_validRequest_returns201() throws Exception {
        UUID targetId = UUID.randomUUID();
        FriendRequestResponse frr = FriendRequestResponse.builder()
                .id(UUID.randomUUID())
                .fromPlayer(samplePublicPlayer(PLAYER_ID, "me"))
                .toPlayer(samplePublicPlayer(targetId, "target"))
                .status(FriendRequestStatus.pending)
                .createdAt(Instant.now())
                .build();
        when(friendService.sendFriendRequest(PLAYER_ID, targetId)).thenReturn(frr);

        mockMvc.perform(post("/players/me/friends/requests")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetPlayerId\":\"" + targetId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void sendFriendRequest_missingTarget_returns400() throws Exception {
        mockMvc.perform(post("/players/me/friends/requests")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void respondToRequest_accept_returns200() throws Exception {
        UUID requestId = UUID.randomUUID();
        FriendRequestResponse frr = FriendRequestResponse.builder()
                .id(requestId)
                .fromPlayer(samplePublicPlayer(FRIEND_ID, "friend"))
                .toPlayer(samplePublicPlayer(PLAYER_ID, "me"))
                .status(FriendRequestStatus.accepted)
                .createdAt(Instant.now())
                .build();
        when(friendService.respondToFriendRequest(PLAYER_ID, requestId, "accept")).thenReturn(frr);

        mockMvc.perform(patch("/players/me/friends/requests/" + requestId)
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"accept\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));
    }

    @Test
    void respondToRequest_invalidAction_returns400() throws Exception {
        UUID requestId = UUID.randomUUID();

        mockMvc.perform(patch("/players/me/friends/requests/" + requestId)
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"invalid\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cancelFriendRequest_withAuth_returns204() throws Exception {
        UUID requestId = UUID.randomUUID();

        mockMvc.perform(delete("/players/me/friends/requests/" + requestId)
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isNoContent());

        verify(friendService).cancelFriendRequest(PLAYER_ID, requestId);
    }

    @Test
    void removeFriend_withAuth_returns204() throws Exception {
        mockMvc.perform(delete("/players/me/friends/" + FRIEND_ID)
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isNoContent());

        verify(friendService).removeFriend(PLAYER_ID, FRIEND_ID);
    }

    @Test
    void listBlocked_withAuth_returns200() throws Exception {
        when(friendService.listBlocked(PLAYER_ID)).thenReturn(List.of());

        mockMvc.perform(get("/players/me/blocked")
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").isArray());
    }

    @Test
    void blockPlayer_validRequest_returns201() throws Exception {
        UUID targetId = UUID.randomUUID();

        mockMvc.perform(post("/players/me/blocked")
                        .header("X-User-Id", PLAYER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerId\":\"" + targetId + "\"}"))
                .andExpect(status().isCreated());

        verify(friendService).blockPlayer(PLAYER_ID, targetId);
    }

    @Test
    void unblockPlayer_withAuth_returns204() throws Exception {
        UUID targetId = UUID.randomUUID();

        mockMvc.perform(delete("/players/me/blocked/" + targetId)
                        .header("X-User-Id", PLAYER_ID.toString()))
                .andExpect(status().isNoContent());

        verify(friendService).unblockPlayer(PLAYER_ID, targetId);
    }
}
