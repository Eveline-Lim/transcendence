package com.transcendence.player.repository;

import com.transcendence.player.entity.Friendship;
import com.transcendence.player.entity.Player;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    Page<Friendship> findByPlayer(Player player, Pageable pageable);

    Optional<Friendship> findByPlayerAndFriend(Player player, Player friend);

    boolean existsByPlayerAndFriend(Player player, Player friend);

    void deleteByPlayerAndFriend(Player player, Player friend);
}
