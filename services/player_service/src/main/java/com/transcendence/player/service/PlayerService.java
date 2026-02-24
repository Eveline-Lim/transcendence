package com.transcendence.player.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendence.player.dto.CreatePlayerRequest;
import com.transcendence.player.dto.PlayerListResponse;
import com.transcendence.player.dto.PlayerResponse;
import com.transcendence.player.dto.PublicPlayerResponse;
import com.transcendence.player.dto.UpdatePlayerRequest;
import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerPreferences;
import com.transcendence.player.entity.PlayerStatistics;
import com.transcendence.player.exception.ConflictException;
import com.transcendence.player.exception.ResourceNotFoundException;
import com.transcendence.player.mapper.PlayerMapper;
import com.transcendence.player.repository.PlayerPreferencesRepository;
import com.transcendence.player.repository.PlayerRepository;
import com.transcendence.player.repository.PlayerStatisticsRepository;
import com.transcendence.player.util.PaginationUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final PlayerStatisticsRepository statisticsRepository;
    private final PlayerPreferencesRepository preferencesRepository;
    private final PlayerMapper mapper;
    private final PasswordEncoder passwordEncoder;

    public PlayerResponse createPlayer(CreatePlayerRequest req) {
        if (playerRepository.existsByUsername(req.getUsername())) {
            throw new ConflictException("Username already exists");
        }
        if (playerRepository.existsByEmail(req.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        Player player = Player.builder()
                .username(req.getUsername())
                .displayName(req.getDisplayName() != null ? req.getDisplayName() : req.getUsername())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .build();
        player = playerRepository.save(player);

        // Initialize statistics
        PlayerStatistics stats = PlayerStatistics.builder().player(player).build();
        statisticsRepository.save(stats);

        // Initialize preferences
        PlayerPreferences prefs = PlayerPreferences.builder().player(player).build();
        preferencesRepository.save(prefs);

        return mapper.toPlayerResponse(player);
    }

    @Transactional(readOnly = true)
    public PlayerListResponse listPlayers(String search, int page, int limit) {
        PageRequest pageable = PageRequest.of(page - 1, limit);
        Page<Player> result;

        if (search != null && !search.isBlank()) {
            result = playerRepository
                    .findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
                            search, search, pageable);
        } else {
            result = playerRepository.findAll(pageable);
        }

        return PlayerListResponse.builder()
                .players(result.getContent().stream().map(mapper::toPublicPlayerResponse).toList())
                .pagination(PaginationUtils.buildPagination(result))
                .build();
    }

    @Transactional(readOnly = true)
    public PlayerResponse getCurrentPlayer(UUID playerId) {
        return mapper.toPlayerResponse(findById(playerId));
    }

    @Transactional(readOnly = true)
    public PublicPlayerResponse getPlayerById(UUID playerId) {
        return mapper.toPublicPlayerResponse(findById(playerId));
    }

    public PlayerResponse updateCurrentPlayer(UUID playerId, UpdatePlayerRequest req) {
        Player player = findById(playerId);
        if (req.getDisplayName() != null)
            player.setDisplayName(req.getDisplayName());
        if (req.getEmail() != null) {
            if (!req.getEmail().equals(player.getEmail())
                    && playerRepository.existsByEmail(req.getEmail())) {
                throw new ConflictException("Email already registered");
            }
            player.setEmail(req.getEmail());
        }
        return mapper.toPlayerResponse(playerRepository.save(player));
    }

    public void deleteCurrentPlayer(UUID playerId) {
        Player player = findById(playerId);
        // Child tables (player_statistics, player_preferences) cascade via FK ON DELETE
        // CASCADE
        playerRepository.delete(player);
    }

    public String updateAvatar(UUID playerId, String avatarUrl) {
        Player player = findById(playerId);
        player.setAvatarUrl(avatarUrl);
        playerRepository.save(player);
        return avatarUrl;
    }

    public void deleteAvatar(UUID playerId) {
        Player player = findById(playerId);
        player.setAvatarUrl(null);
        playerRepository.save(player);
    }

    public Player findById(UUID playerId) {
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found"));
    }
}
