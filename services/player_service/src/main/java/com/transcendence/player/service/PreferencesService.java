package com.transcendence.player.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendence.player.dto.PlayerPreferencesResponse;
import com.transcendence.player.dto.UpdatePreferencesRequest;
import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerPreferences;
import com.transcendence.player.mapper.PlayerMapper;
import com.transcendence.player.repository.PlayerPreferencesRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PreferencesService {

    private final PlayerPreferencesRepository preferencesRepository;
    private final PlayerService playerService;
    private final PlayerMapper mapper;

    @Transactional(readOnly = true)
    public PlayerPreferencesResponse getPreferences(UUID playerId) {
        PlayerPreferences prefs = getOrCreate(playerId);
        return mapper.toPreferencesResponse(prefs);
    }

    public PlayerPreferencesResponse updatePreferences(UUID playerId, UpdatePreferencesRequest req) {
        PlayerPreferences prefs = getOrCreate(playerId);

        if (req.getTheme() != null)
            prefs.setTheme(req.getTheme());
        if (req.getLanguage() != null)
            prefs.setLanguage(req.getLanguage());
        if (req.getSoundEnabled() != null)
            prefs.setSoundEnabled(req.getSoundEnabled());
        if (req.getMusicEnabled() != null)
            prefs.setMusicEnabled(req.getMusicEnabled());
        if (req.getSoundVolume() != null)
            prefs.setSoundVolume(req.getSoundVolume());
        if (req.getMusicVolume() != null)
            prefs.setMusicVolume(req.getMusicVolume());
        if (req.getNotifyFriendRequests() != null)
            prefs.setNotifyFriendRequests(req.getNotifyFriendRequests());
        if (req.getNotifyGameInvites() != null)
            prefs.setNotifyGameInvites(req.getNotifyGameInvites());
        if (req.getNotifyTournamentUpdates() != null)
            prefs.setNotifyTournamentUpdates(req.getNotifyTournamentUpdates());
        if (req.getPaddleColor() != null)
            prefs.setPaddleColor(req.getPaddleColor());
        if (req.getBallColor() != null)
            prefs.setBallColor(req.getBallColor());
        if (req.getTableColor() != null)
            prefs.setTableColor(req.getTableColor());
        if (req.getShowFps() != null)
            prefs.setShowFps(req.getShowFps());
        if (req.getEnablePowerUps() != null)
            prefs.setEnablePowerUps(req.getEnablePowerUps());
        if (req.getShowOnlineStatus() != null)
            prefs.setShowOnlineStatus(req.getShowOnlineStatus());
        if (req.getAllowFriendRequests() != null)
            prefs.setAllowFriendRequests(req.getAllowFriendRequests());
        if (req.getShowMatchHistory() != null)
            prefs.setShowMatchHistory(req.getShowMatchHistory());
        if (req.getShowStatistics() != null)
            prefs.setShowStatistics(req.getShowStatistics());

        return mapper.toPreferencesResponse(preferencesRepository.save(prefs));
    }

    private PlayerPreferences getOrCreate(UUID playerId) {
        Player player = playerService.findById(playerId);
        return preferencesRepository.findByPlayer(player)
                .orElseGet(() -> preferencesRepository.save(
                        PlayerPreferences.builder().player(player).build()));
    }
}
