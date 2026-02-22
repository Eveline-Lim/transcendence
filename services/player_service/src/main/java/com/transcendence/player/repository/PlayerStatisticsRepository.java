package com.transcendence.player.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerStatistics;

public interface PlayerStatisticsRepository extends JpaRepository<PlayerStatistics, UUID> {

    Optional<PlayerStatistics> findByPlayer(Player player);

    Page<PlayerStatistics> findAllByOrderByEloRatingDesc(Pageable pageable);
}
