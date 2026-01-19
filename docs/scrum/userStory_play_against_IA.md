User Story: Play against AI
As a practicing player,
I want to play a match against an AI opponent with selectable difficulty,
So that I can improve my skills without ranking pressure.

1. Description
- User selects "Practice Mode".
- User chooses difficulty (Easy, Medium, Hard).
- Game starts immediately without a queue.

2. Acceptance Criteria
    - [ ] **Difficulty Selection**:
        - **Easy**: AI moves randomly or slowly, tracks ball loosely.
        - **Medium**: AI tracks ball consistently but has reaction delay.
        - **Hard**: AI tracks ball perfectly, predicts bounces.
    - [ ] **Game Isolation**:
        - AI games do NOT affect player ranking/MMR.
        - AI games DO increment "Practice Matches" stat if tracked.
    - [ ] **Performance**:
        - AI calculation must likely run on the server to prevent client-side cheating (even in practice).

3. Technical Implementation
    - **AI Opponent Service**:
        - Logic to calculate paddle position based on ball state.
        - Definition: `ai_opponent_service.proto`.
    - **Game Service**:
        - Reuse standard game loop but inject AI input instead of 2nd player socket input.

4. Edge Cases
    - User disconnects: Game simply terminates (no penalty).
    - AI "perfect" loop: Ensure Hard AI is beatable (add small error margin).
