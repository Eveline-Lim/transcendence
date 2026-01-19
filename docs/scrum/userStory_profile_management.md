User Story: Profile Management & Statistics
As a registered player,
I want to view my profile to see my stats and match history, and customize my public appearance,
So that I can track my progress and express my identity.

1. Description
- Users have a public profile showing stats (Wins, Losses, Rank).
- Users can upload an avatar.
- Users can view match history with details.

2. Acceptance Criteria
    - [ ] **Public Profile**:
        - Accessible via `/profile/:username`.
        - Displays: Avatar, Display Name, Status (Online/Offline), Stats (Wins/Losses/Ladder Rank).
    - [ ] **Match History**:
        - List of last N matches played.
        - Details: Opponent name, Score (e.g., 11-5), Date.
    - [ ] **Settings**:
        - Update Display Name.
        - Upload/Update Avatar (Image file validation).
    - [ ] **Ranking**:
        - Display current global leaderboard rank (e.g., #42).

3. Technical Implementation
    - **Player Service**:
        - `GET /players/:id` for public info.
        - `GET /players/:id/stats`.
        - `GET /players/:id/history`.
        - `PATCH /players/me` for updates.
    - **File Storage**:
        - Logic to handle avatar uploads (local volume or S3-compatible).

4. Edge Cases
    - Uploading non-image files or very large files.
    - Viewing a profile of a blocked user (Hide info?).
