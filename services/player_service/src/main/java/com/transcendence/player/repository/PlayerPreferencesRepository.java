package com.transcendence.player.repository;

import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerPreferences;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlayerPreferencesRepository extends JpaRepository<PlayerPreferences, UUID> {

    Optional<PlayerPreferences> findByPlayer(Player player);
}
