package com.transcendence.player.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendence.player.dto.FriendListResponse;
import com.transcendence.player.dto.FriendRequestListResponse;
import com.transcendence.player.dto.FriendRequestResponse;
import com.transcendence.player.dto.PublicPlayerResponse;
import com.transcendence.player.entity.BlockedPlayer;
import com.transcendence.player.entity.FriendRequest;
import com.transcendence.player.entity.FriendRequestStatus;
import com.transcendence.player.entity.Friendship;
import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerStatus;
import com.transcendence.player.exception.ConflictException;
import com.transcendence.player.exception.ResourceNotFoundException;
import com.transcendence.player.mapper.PlayerMapper;
import com.transcendence.player.repository.BlockedPlayerRepository;
import com.transcendence.player.repository.FriendRequestRepository;
import com.transcendence.player.repository.FriendshipRepository;
import com.transcendence.player.util.PaginationUtils;

import lombok.RequiredArgsConstructor;

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
    public FriendListResponse listFriends(UUID playerId, int page, int limit, String status) {
        Player player = playerService.findById(playerId);
        PageRequest pageable = PageRequest.of(page - 1, limit);
        Page<Friendship> result;
        if (status != null) {
            PlayerStatus playerStatus = PlayerStatus.valueOf(status);
            result = friendshipRepository.findByPlayerAndFriendStatus(player, playerStatus, pageable);
        } else {
            result = friendshipRepository.findByPlayer(player, pageable);
        }
        return FriendListResponse.builder()
                .friends(result.getContent().stream().map(mapper::toFriendResponse).toList())
                .pagination(PaginationUtils.buildPagination(result))
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

        // Check if either player has blocked the other
        if (blockedPlayerRepository.existsByBlockerAndBlocked(to, from)) {
            throw new ResourceNotFoundException("Player not found");
        }
        if (blockedPlayerRepository.existsByBlockerAndBlocked(from, to)) {
            throw new ConflictException("Cannot send friend request to a blocked player");
        }

        if (friendshipRepository.existsByPlayerAndFriend(from, to)) {
            throw new ConflictException("Already friends");
        }

        // Check for a reverse pending request (to → from) — auto-accept on mutual
        // interest
        Optional<FriendRequest> reverse = friendRequestRepository.findByFromPlayerAndToPlayer(to, from);
        if (reverse.isPresent() && reverse.get().getStatus() == FriendRequestStatus.pending) {
            FriendRequest rev = reverse.get();
            rev.setStatus(FriendRequestStatus.accepted);
            friendshipRepository.save(Friendship.builder()
                    .player(rev.getFromPlayer())
                    .friend(rev.getToPlayer())
                    .build());
            friendshipRepository.save(Friendship.builder()
                    .player(rev.getToPlayer())
                    .friend(rev.getFromPlayer())
                    .build());
            return mapper.toFriendRequestResponse(friendRequestRepository.save(rev));
        }

        // Check for any existing request between these players
        Optional<FriendRequest> existing = friendRequestRepository.findByFromPlayerAndToPlayer(from, to);
        if (existing.isPresent()) {
            FriendRequest req = existing.get();
            if (req.getStatus() == FriendRequestStatus.pending) {
                throw new ConflictException("Friend request already sent");
            }
            // Delete old rejected/accepted request to allow re-sending
            friendRequestRepository.delete(req);
            friendRequestRepository.flush();
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
}
