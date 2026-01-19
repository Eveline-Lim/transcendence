User Story: Matchmaking & Core Gameplay (PvP)
As a competitive player,
I want to join a queue, get matched with an opponent, and play a ranked game,
So that I can climb the leaderboard.

1. Description
- The user enters a standard matchmaking queue.
- The system pairs users based on availability (and optionally MMR/Elo).
- The game launches, plays to completion, and updates stats.

2. Acceptance Criteria
    - [ ] **Queueing**: 
        - User can click "Find Match" to enter the queue.
        - UI shows "Searching..." timer.
        - User can cancel queue.
    - [ ] **Match Found**: 
        - Both players receive a "Match Found" event.
        - Redirected effectively to the Game Room.
    - [ ] **Gameplay**:
        - Paddle limits, ball physics, and scoring work according to Game Service logic.
        - First to 11 points (or time limit) wins.
    - [ ] **Post-Game**:
        - Winner sees "Victory", Loser sees "Defeat".
        - Both players' profiles are updated with +1 Game Played.
        - Winner gets Leaderboard points.

3. Technical Implementation
    - **Match Service**:
        - In-memory queue (Redis or local array).
        - Matching logic: FIFO (First-In-First-Out) for now.
    - **Game Service**:
        - Physics engine loop (server-side authoritative or client-side prediction).
        - `POST /games/start` (internal trigger).
    - **Player Service**:
        - `POST /stats/update` (called by Game Service after match).

4. Edge Cases
    - **Disconnection**: 
        - If a player disconnects during the game: Auto-forfeit after 30s or pause? (Decision: Auto-forfeit).
    - **Queue Timeout**: 
        - If no match found in 2 minutes, ask user to keep waiting or retry.
