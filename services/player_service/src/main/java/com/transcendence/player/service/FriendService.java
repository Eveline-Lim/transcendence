package com.transcendence.player.service;

import com.transcendence.player.dto.*;
import com.transcendence.player.entity.*;
import com.transcendence.player.exception.ConflictException;
import com.transcendence.player.exception.ResourceNotFoundException;
import com.transcendence.player.mapper.PlayerMapper;
import com.transcendence.player.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final BlockedPlayerRepository blockedPlayerRepository;
    private final PlayerService playerService;
    private final PlayerMapper mapper;

    @Transactional(readOnly = true)
    public FriendListResponse listFriends(UUID playerId, int page, int limit) {
        Player player = playerService.findById(playerId);
        PageRequest pageable = PageRequest.of(page - 1, limit);
        Page<Friendship> result = friendshipRepository.findByPlayer(player, pageable);
        return FriendListResponse.builder()
                .friends(result.getContent().stream().map(mapper::toFriendResponse).toList())
                .pagination(buildPagination(result))
                .build();
    }

    @Transactional(readOnly = true)
    public FriendRequestListResponse listFriendRequests(UUID playerId, String direction) {
        Player player = playerService.findById(playerId);
        List<FriendRequest> requests;
        if ("outgoing".equals(direction)) {
            requests = friendRequestRepository.findByFromPlayerAndStatus(player, FriendRequestStatus.pending);
        } else {
            requests = friendRequestRepository.findByToPlayerAndStatus(player, FriendRequestStatus.pending);
        }
        return FriendRequestListResponse.builder()
                .requests(requests.stream().map(mapper::toFriendRequestResponse).toList())
                .build();
    }

    public FriendRequestResponse sendFriendRequest(UUID fromId, UUID targetId) {
        if (fromId.equals(targetId)) {
            throw new ConflictException("Cannot send friend request to yourself");
        }
        Player from = playerService.findById(fromId);
        Player to = playerService.findById(targetId);

        if (friendshipRepository.existsByPlayerAndFriend(from, to)) {
            throw new ConflictException("Already friends");
        }
        if (friendRequestRepository.existsByFromPlayerAndToPlayerAndStatus(from, to, FriendRequestStatus.pending)) {
            throw new ConflictException("Friend request already sent");
        }

        FriendRequest request = FriendRequest.builder()
                .fromPlayer(from)
                .toPlayer(to)
                .build();
        return mapper.toFriendRequestResponse(friendRequestRepository.save(request));
    }

    public FriendRequestResponse respondToFriendRequest(UUID playerId, UUID requestId, String action) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request not found"));

        if (!request.getToPlayer().getId().equals(playerId)) {
            throw new ResourceNotFoundException("Friend request not found");
        }

        if ("accept".equals(action)) {
            request.setStatus(FriendRequestStatus.accepted);
            // Create bidirectional friendship
            friendshipRepository.save(Friendship.builder()
                    .player(request.getFromPlayer())
                    .friend(request.getToPlayer())
                    .build());
            friendshipRepository.save(Friendship.builder()
                    .player(request.getToPlayer())
                    .friend(request.getFromPlayer())
                    .build());
        } else {
            request.setStatus(FriendRequestStatus.rejected);
        }

        return mapper.toFriendRequestResponse(friendRequestRepository.save(request));
    }

    public void cancelFriendRequest(UUID playerId, UUID requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request not found"));
        if (!request.getFromPlayer().getId().equals(playerId)) {
            throw new ResourceNotFoundException("Friend request not found");
        }
        friendRequestRepository.delete(request);
    }

    public void removeFriend(UUID playerId, UUID friendId) {
        Player player = playerService.findById(playerId);
        Player friend = playerService.findById(friendId);
        if (!friendshipRepository.existsByPlayerAndFriend(player, friend)) {
            throw new ResourceNotFoundException("Friendship not found");
        }
        friendshipRepository.deleteByPlayerAndFriend(player, friend);
        friendshipRepository.deleteByPlayerAndFriend(friend, player);
    }

    @Transactional(readOnly = true)
    public List<PublicPlayerResponse> listBlocked(UUID playerId) {
        Player player = playerService.findById(playerId);
        return blockedPlayerRepository.findByBlocker(player).stream()
                .map(b -> mapper.toPublicPlayerResponse(b.getBlocked()))
                .toList();
    }

    public void blockPlayer(UUID blockerId, UUID targetId) {
        if (blockerId.equals(targetId)) {
            throw new ConflictException("Cannot block yourself");
        }
        Player blocker = playerService.findById(blockerId);
        Player blocked = playerService.findById(targetId);

        if (blockedPlayerRepository.existsByBlockerAndBlocked(blocker, blocked)) {
            throw new ConflictException("Player already blocked");
        }
        blockedPlayerRepository.save(BlockedPlayer.builder()
                .blocker(blocker)
                .blocked(blocked)
                .build());
    }

    public void unblockPlayer(UUID blockerId, UUID targetId) {
        Player blocker = playerService.findById(blockerId);
        Player blocked = playerService.findById(targetId);
        if (!blockedPlayerRepository.existsByBlockerAndBlocked(blocker, blocked)) {
            throw new ResourceNotFoundException("Block not found");
        }
        blockedPlayerRepository.deleteByBlockerAndBlocked(blocker, blocked);
    }

    private PaginationResponse buildPagination(Page<?> page) {
        return PaginationResponse.builder()
                .page(page.getNumber() + 1)
                .limit(page.getSize())
                .total(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}
