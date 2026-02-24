package com.transcendence.player.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendence.player.dto.GamePreferences;
import com.transcendence.player.dto.NotificationPreferences;
import com.transcendence.player.dto.PlayerPreferencesResponse;
import com.transcendence.player.dto.PrivacyPreferences;
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

        NotificationPreferences n = req.getNotifications();
        if (n != null) {
            if (n.getFriendRequests() != null)
                prefs.setNotifyFriendRequests(n.getFriendRequests());
            if (n.getGameInvites() != null)
                prefs.setNotifyGameInvites(n.getGameInvites());
            if (n.getTournamentUpdates() != null)
                prefs.setNotifyTournamentUpdates(n.getTournamentUpdates());
        }

        GamePreferences g = req.getGameSettings();
        if (g != null) {
            if (g.getPaddleColor() != null)
                prefs.setPaddleColor(g.getPaddleColor());
            if (g.getBallColor() != null)
                prefs.setBallColor(g.getBallColor());
            if (g.getTableColor() != null)
                prefs.setTableColor(g.getTableColor());
            if (g.getShowFps() != null)
                prefs.setShowFps(g.getShowFps());
            if (g.getEnablePowerUps() != null)
                prefs.setEnablePowerUps(g.getEnablePowerUps());
        }

        PrivacyPreferences p = req.getPrivacy();
        if (p != null) {
            if (p.getShowOnlineStatus() != null)
                prefs.setShowOnlineStatus(p.getShowOnlineStatus());
            if (p.getAllowFriendRequests() != null)
                prefs.setAllowFriendRequests(p.getAllowFriendRequests());
            if (p.getShowMatchHistory() != null)
                prefs.setShowMatchHistory(p.getShowMatchHistory());
            if (p.getShowStatistics() != null)
                prefs.setShowStatistics(p.getShowStatistics());
        }

        return mapper.toPreferencesResponse(preferencesRepository.save(prefs));
    }

    private PlayerPreferences getOrCreate(UUID playerId) {
        Player player = playerService.findById(playerId);
        return preferencesRepository.findByPlayer(player)
                .orElseGet(() -> preferencesRepository.save(
                        PlayerPreferences.builder().player(player).build()));
    }
}
