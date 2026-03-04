package com.transcendence.player.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendence.player.entity.GameMode;
import com.transcendence.player.entity.MatchRecord;
import com.transcendence.player.entity.MatchResult;
import com.transcendence.player.entity.Player;

public interface MatchRecordRepository extends JpaRepository<MatchRecord, UUID> {

    Page<MatchRecord> findByPlayer(Player player, Pageable pageable);

    Page<MatchRecord> findByPlayerAndResult(Player player, MatchResult result, Pageable pageable);

    Page<MatchRecord> findByPlayerAndGameMode(Player player, GameMode gameMode, Pageable pageable);

    Page<MatchRecord> findByPlayerAndResultAndGameMode(
            Player player, MatchResult result, GameMode gameMode, Pageable pageable);
}
