package com.transcendence.player.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerStatistics;

public interface PlayerStatisticsRepository extends JpaRepository<PlayerStatistics, UUID> {

    Optional<PlayerStatistics> findByPlayer(Player player);

    Page<PlayerStatistics> findAllByOrderByEloRatingDesc(Pageable pageable);

    Page<PlayerStatistics> findAllByOrderByWinsDesc(Pageable pageable);

    Page<PlayerStatistics> findAllByOrderByGamesPlayedDesc(Pageable pageable);

    @Query("SELECT ps FROM PlayerStatistics ps ORDER BY CASE WHEN ps.gamesPlayed > 0 THEN (CAST(ps.wins AS double) / ps.gamesPlayed) ELSE 0 END DESC")
    Page<PlayerStatistics> findAllByOrderByWinRateDesc(Pageable pageable);

    long countByEloRatingGreaterThan(int eloRating);
}
