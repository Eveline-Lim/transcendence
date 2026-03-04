CREATE TABLE IF NOT EXISTS players (
    id           UUID        NOT NULL,
    username     VARCHAR(20) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    email        TEXT        NOT NULL,
    password     TEXT        NOT NULL,
    avatar_url   TEXT,
    status       VARCHAR(20),
    created_at   TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ,
    CONSTRAINT pk_players PRIMARY KEY (id),
    CONSTRAINT uq_players_username UNIQUE (username),
    CONSTRAINT uq_players_email    UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS player_statistics (
    player_id             UUID    NOT NULL,
    games_played          INTEGER NOT NULL DEFAULT 0,
    wins                  INTEGER NOT NULL DEFAULT 0,
    losses                INTEGER NOT NULL DEFAULT 0,
    draws                 INTEGER NOT NULL DEFAULT 0,
    total_points_scored   INTEGER NOT NULL DEFAULT 0,
    total_points_conceded INTEGER NOT NULL DEFAULT 0,
    longest_win_streak    INTEGER NOT NULL DEFAULT 0,
    current_win_streak    INTEGER NOT NULL DEFAULT 0,
    elo_rating            INTEGER NOT NULL DEFAULT 1000,
    CONSTRAINT pk_player_statistics PRIMARY KEY (player_id),
    CONSTRAINT fk_player_statistics_player FOREIGN KEY (player_id)
        REFERENCES players (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_preferences (
    player_id                 UUID        NOT NULL,
    theme                     VARCHAR(20) NOT NULL DEFAULT 'system',
    language                  VARCHAR(10) NOT NULL DEFAULT 'en',
    sound_enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
    music_enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
    sound_volume              INTEGER     NOT NULL DEFAULT 80,
    music_volume              INTEGER     NOT NULL DEFAULT 50,
    notify_friend_requests    BOOLEAN     NOT NULL DEFAULT TRUE,
    notify_game_invites       BOOLEAN     NOT NULL DEFAULT TRUE,
    notify_tournament_updates BOOLEAN     NOT NULL DEFAULT FALSE,
    paddle_color              VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    ball_color                VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    table_color               VARCHAR(20) NOT NULL DEFAULT '#000000',
    show_fps                  BOOLEAN     NOT NULL DEFAULT FALSE,
    enable_power_ups          BOOLEAN     NOT NULL DEFAULT TRUE,
    show_online_status        BOOLEAN     NOT NULL DEFAULT TRUE,
    allow_friend_requests     BOOLEAN     NOT NULL DEFAULT TRUE,
    show_match_history        BOOLEAN     NOT NULL DEFAULT TRUE,
    show_statistics           BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_player_preferences PRIMARY KEY (player_id),
    CONSTRAINT fk_player_preferences_player FOREIGN KEY (player_id)
        REFERENCES players (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_records (
    id             UUID        NOT NULL,
    player_id      UUID        NOT NULL,
    opponent_id    UUID,
    player_score   INTEGER     NOT NULL DEFAULT 0,
    opponent_score INTEGER     NOT NULL DEFAULT 0,
    result         VARCHAR(10) NOT NULL,
    game_mode      VARCHAR(10) NOT NULL,
    duration       INTEGER,
    played_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT pk_match_records PRIMARY KEY (id),
    CONSTRAINT fk_match_records_player   FOREIGN KEY (player_id)   REFERENCES players (id),
    CONSTRAINT fk_match_records_opponent FOREIGN KEY (opponent_id) REFERENCES players (id)
);

CREATE TABLE IF NOT EXISTS blocked_players (
    id         UUID NOT NULL,
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
    CONSTRAINT pk_blocked_players  PRIMARY KEY (id),
    CONSTRAINT uq_blocked_players  UNIQUE (blocker_id, blocked_id),
    CONSTRAINT fk_blocked_blocker  FOREIGN KEY (blocker_id) REFERENCES players (id),
    CONSTRAINT fk_blocked_blocked  FOREIGN KEY (blocked_id) REFERENCES players (id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
    id             UUID        NOT NULL,
    from_player_id UUID        NOT NULL,
    to_player_id   UUID        NOT NULL,
    status         VARCHAR(20),
    created_at     TIMESTAMPTZ,
    CONSTRAINT pk_friend_requests PRIMARY KEY (id),
    CONSTRAINT uq_friend_requests UNIQUE (from_player_id, to_player_id),
    CONSTRAINT fk_friend_requests_from FOREIGN KEY (from_player_id) REFERENCES players (id),
    CONSTRAINT fk_friend_requests_to   FOREIGN KEY (to_player_id)   REFERENCES players (id)
);

CREATE TABLE IF NOT EXISTS friendships (
    id            UUID        NOT NULL,
    player_id     UUID        NOT NULL,
    friend_id     UUID        NOT NULL,
    friends_since TIMESTAMPTZ,
    CONSTRAINT pk_friendships  PRIMARY KEY (id),
    CONSTRAINT uq_friendships  UNIQUE (player_id, friend_id),
    CONSTRAINT fk_friendships_player FOREIGN KEY (player_id) REFERENCES players (id),
    CONSTRAINT fk_friendships_friend FOREIGN KEY (friend_id) REFERENCES players (id)
);
