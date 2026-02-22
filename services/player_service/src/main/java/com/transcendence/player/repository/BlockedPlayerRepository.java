package com.transcendence.player.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendence.player.entity.BlockedPlayer;
import com.transcendence.player.entity.Player;

public interface BlockedPlayerRepository extends JpaRepository<BlockedPlayer, UUID> {

    List<BlockedPlayer> findByBlocker(Player blocker);

    Optional<BlockedPlayer> findByBlockerAndBlocked(Player blocker, Player blocked);

    boolean existsByBlockerAndBlocked(Player blocker, Player blocked);

    void deleteByBlockerAndBlocked(Player blocker, Player blocked);
}
