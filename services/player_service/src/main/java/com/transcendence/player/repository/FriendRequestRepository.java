package com.transcendence.player.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendence.player.entity.FriendRequest;
import com.transcendence.player.entity.FriendRequestStatus;
import com.transcendence.player.entity.Player;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, UUID> {

        List<FriendRequest> findByToPlayerAndStatus(Player toPlayer, FriendRequestStatus status);

        List<FriendRequest> findByFromPlayerAndStatus(Player fromPlayer, FriendRequestStatus status);

        Optional<FriendRequest> findByFromPlayerAndToPlayerAndStatus(
                        Player fromPlayer, Player toPlayer, FriendRequestStatus status);

        boolean existsByFromPlayerAndToPlayerAndStatus(
                        Player fromPlayer, Player toPlayer, FriendRequestStatus status);

        Optional<FriendRequest> findByFromPlayerAndToPlayer(Player fromPlayer, Player toPlayer);
}
