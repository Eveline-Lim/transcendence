package com.transcendence.player.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "match_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opponent_id")
    private Player opponent;

    private int playerScore;

    private int opponentScore;

    @Column(nullable = false, length = 10)
    private String result; // win, loss, draw

    @Column(nullable = false, length = 10)
    private String gameMode; // casual, ranked, ai

    private int duration; // seconds

    @Column(nullable = false)
    private Instant playedAt;
}
