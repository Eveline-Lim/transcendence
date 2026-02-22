package com.transcendence.player.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "friend_requests", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"from_player_id", "to_player_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FriendRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_player_id", nullable = false)
    private Player fromPlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_player_id", nullable = false)
    private Player toPlayer;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FriendRequestStatus status = FriendRequestStatus.pending;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
