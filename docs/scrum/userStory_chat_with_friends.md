User Story: Chat with Friends
As a friendly player,
Once logged-in, I want to add users to my friends list and chat with them in real-time,
So that I can socialize and arrange games.

1. Description
- The user can add a friend using their unique username.
- The user can view their friends list and online status.
- The user can exchange text messages in real-time.
- Included features: Block/Unblock users.

2. Acceptance Criteria
    - [ ] **Add Friend**: 
        - Searching for a valid username sends a friend request.
        - Receiver can Accept or Decline the request.
    - [ ] **Chat Interface**: 
        - Chat window opens upon selecting a friend.
        - Messages are sent and received in real-time (WebSocket).
        - Chat history is loaded when opening the window (last 50 messages).
    - [ ] **User Status**: 
        - Friends list shows Online/In-Game/Offline status.
    - [ ] **Blocking**: 
        - Blocking a user prevents them from sending messages or friend requests.

3. Technical Implementation
    - **Frontend**: Chat UI component, WebSocket client (Socket.io/ws), State management for friend list.
    - **Backend (Player Service)**: 
        - `POST /friends/request`
        - `PUT /friends/respond`
        - `GET /friends`
    - **Backend (Chat Service)**:
        - `WS /chat`: Handle `send_message`, `receive_message` events.
        - Database: Store messages with timestamps.

4. Edge Cases
    - User searches for non-existent username.
    - User tries to add a user who has blocked them.
    - Message sent while recipient is offline (store and forward/notification).
