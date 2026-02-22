package com.transcendence.player.mapper;

import org.springframework.stereotype.Component;

import com.transcendence.player.dto.FriendRequestResponse;
import com.transcendence.player.dto.FriendResponse;
import com.transcendence.player.dto.MatchRecordResponse;
import com.transcendence.player.dto.PlayerPreferencesResponse;
import com.transcendence.player.dto.PlayerResponse;
import com.transcendence.player.dto.PlayerStatisticsResponse;
import com.transcendence.player.dto.PublicPlayerResponse;
import com.transcendence.player.entity.FriendRequest;
import com.transcendence.player.entity.Friendship;
import com.transcendence.player.entity.MatchRecord;
import com.transcendence.player.entity.Player;
import com.transcendence.player.entity.PlayerPreferences;
import com.transcendence.player.entity.PlayerStatistics;

@Component
public class PlayerMapper {

    public PlayerResponse toPlayerResponse(Player p) {
        return PlayerResponse.builder()
                .id(p.getId())
                .username(p.getUsername())
                .displayName(p.getDisplayName())
                .email(p.getEmail())
                .avatarUrl(p.getAvatarUrl())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    public PublicPlayerResponse toPublicPlayerResponse(Player p) {
        return PublicPlayerResponse.builder()
                .id(p.getId())
                .username(p.getUsername())
                .displayName(p.getDisplayName())
                .avatarUrl(p.getAvatarUrl())
                .status(p.getStatus())
                .build();
    }

    public FriendResponse toFriendResponse(Friendship f) {
        return FriendResponse.builder()
                .id(f.getId())
                .player(toPublicPlayerResponse(f.getFriend()))
                .friendsSince(f.getFriendsSince())
                .build();
    }

    public FriendRequestResponse toFriendRequestResponse(FriendRequest fr) {
        return FriendRequestResponse.builder()
                .id(fr.getId())
                .fromPlayer(toPublicPlayerResponse(fr.getFromPlayer()))
                .toPlayer(toPublicPlayerResponse(fr.getToPlayer()))
                .status(fr.getStatus())
                .createdAt(fr.getCreatedAt())
                .build();
    }

    public PlayerStatisticsResponse toStatisticsResponse(PlayerStatistics s, Integer rank) {
        return PlayerStatisticsResponse.builder()
                .playerId(s.getPlayerId())
                .gamesPlayed(s.getGamesPlayed())
                .wins(s.getWins())
                .losses(s.getLosses())
                .draws(s.getDraws())
                .winRate(s.getWinRate())
                .totalPointsScored(s.getTotalPointsScored())
                .totalPointsConceded(s.getTotalPointsConceded())
                .longestWinStreak(s.getLongestWinStreak())
                .currentWinStreak(s.getCurrentWinStreak())
                .eloRating(s.getEloRating())
                .rank(rank)
                .build();
    }

    public MatchRecordResponse toMatchRecordResponse(MatchRecord m) {
        return MatchRecordResponse.builder()
                .id(m.getId())
                .opponent(m.getOpponent() != null ? toPublicPlayerResponse(m.getOpponent()) : null)
                .playerScore(m.getPlayerScore())
                .opponentScore(m.getOpponentScore())
                .result(m.getResult())
                .gameMode(m.getGameMode())
                .duration(m.getDuration())
                .playedAt(m.getPlayedAt())
                .build();
    }

    public PlayerPreferencesResponse toPreferencesResponse(PlayerPreferences p) {
        return PlayerPreferencesResponse.builder()
                .theme(p.getTheme())
                .language(p.getLanguage())
                .soundEnabled(p.isSoundEnabled())
                .musicEnabled(p.isMusicEnabled())
                .soundVolume(p.getSoundVolume())
                .musicVolume(p.getMusicVolume())
                .notifyFriendRequests(p.isNotifyFriendRequests())
                .notifyGameInvites(p.isNotifyGameInvites())
                .notifyTournamentUpdates(p.isNotifyTournamentUpdates())
                .paddleColor(p.getPaddleColor())
                .ballColor(p.getBallColor())
                .tableColor(p.getTableColor())
                .showFps(p.isShowFps())
                .enablePowerUps(p.isEnablePowerUps())
                .showOnlineStatus(p.isShowOnlineStatus())
                .allowFriendRequests(p.isAllowFriendRequests())
                .showMatchHistory(p.isShowMatchHistory())
                .showStatistics(p.isShowStatistics())
                .build();
    }
}
