package com.transcendence.player.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerPreferences;

public interface PlayerPreferencesRepository extends JpaRepository<PlayerPreferences, UUID> {

    Optional<PlayerPreferences> findByPlayer(Player player);
}
