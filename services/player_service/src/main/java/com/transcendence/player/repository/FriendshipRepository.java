package com.transcendence.player.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendence.player.entity.Friendship;
import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerStatus;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    Page<Friendship> findByPlayer(Player player, Pageable pageable);

    Page<Friendship> findByPlayerAndFriendStatus(Player player, PlayerStatus status, Pageable pageable);

    Optional<Friendship> findByPlayerAndFriend(Player player, Player friend);

    boolean existsByPlayerAndFriend(Player player, Player friend);

    void deleteByPlayerAndFriend(Player player, Player friend);
}
