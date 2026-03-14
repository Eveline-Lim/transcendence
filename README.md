*This project has been created as part of the 42 curriculum by
	evlim,
	thbasse,
	hsoyal,
	kahoumou,
	ckenaip.*

## Description

ft_transcendence is a full-stack web application built around a real-time Pong game. Players can compete online against other players, challenge an AI opponent, or play locally in offline mode. The project features a React frontend, a TypeScript/Node.js backend powered by Fastify and Express, real-time communication via Socket.io, and Redis for state management.

## Quick Start / Instructions

> No clone needed. Requires `docker`, `docker compose`, and `openssl`.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Eveline-Lim/transcendence/refs/heads/dev/install.sh)
```

The script will:
1. Run `setup-secrets.sh` to create all required secrets (including a self-signed SSL cert)
2. Download `docker-compose.yml` and `docker-compose.ghcr.yml` locally
3. Pull and start all services using pre-built GHCR images

Once up:
- **HTTP** → http://localhost:8080 (redirects to HTTPS)
- **HTTPS** → https://localhost:8443

---

## Modules

### MAJORS

#### Web

- Use a framework for both the frontend and backend.
  - **Frontend:** React
  - **Backend:** TypeScript / Node.js with Fastify. Express for the game-service


- Implement real-time features using WebSockets or similar technology.
  - Real-time updates across clients.
  - Handle connection/disconnection gracefully.
  - Efficient message broadcasting.

- Allow users to interact with other users. The minimum requirements are:
  - A basic chat system (send/receive messages between users).
  - A profile system (view user information).
  - A friends system (add/remove friends, see friends list).

- A public API to interact with the database with a secured API key, rate
limiting, documentation, and at least 5 endpoints:
  - GET /api/{something}
  - POST /api/{something}
  - PUT /api/{something}
  - DELETE /api/{something}
  - PATCH /api/{something}
  - Check for more details: https://eveline-lim.github.io/transcendence/

**User Management**

- Standard user management and authentication.
  - Users can update their profile information.
  - Users can upload an avatar (with a default avatar if none provided).
  - Users can add other users as friends and see their online status.
  - Users have a profile page displaying their information.

**Artificial Intelligence**

- Introduce an AI Opponent for games.
  - The AI must be challenging and able to win occasionally.
  - The AI should simulate human-like behavior (not perfect play).
  - You must be able to explain your AI implementation during evaluation.

  ```markdown

**Artificial Intelligence**
- Introduce an AI Opponent for games.
- Built as a standalone Python microservice, chosen for its readability and rich standard library for algorithmic AI — no heavy ML framework needed.

  - Communicates with the game engine over gRPC (Protocol Buffers), chosen over REST for its low-latency binary serialization,
     and native support for bidirectional streaming — critical for real-time play at 60 updates per second.

  - Exposes three RPCs: GetMove for single move requests, StreamMoves for real-time bidirectional gameplay, and AnalyzeMatch for post-match pattern learning.

  - Fully algorithmic approach: ball trajectory is predicted by simulating wall bounces forward, making every decision traceable and explainable.

  - Four difficulty levels (Easy, Medium, Impossible), each with tuned reaction delays, prediction error margins, tracking zones, and update frequencies. 
    Humanization relies on Gaussian distribution (random.gauss) rather than uniform randomness, so behavior clusters naturally around a realistic center.

  - When power-ups are enabled, the AI evaluates active items on the field and adjusts, 
    positioning toward beneficial ones when no immediate ball threat exists.
    
  - A lightweight player profiling system detects tendencies (high/low bias, timing patterns)
    from match history and adapts predictions in subsequent games.

  - Runs asynchronously with grpc.aio, handles graceful shutdown via loop.add_signal_handler(), 
    and ships as a slim Docker image integrated into the project's docker-compose stack.


**Cybersecurity**

- Implement WAF/ModSecurity (hardened) + HashiCorp Vault for secrets:
  - Configure strict ModSecurity/WAF.
  - Manage secrets in Vault (API keys, credentials, environment variables), encrypted and isolated.

**Gaming and user experience**

- Implement a complete web-based game where users can play against each
other.
  - We built a real-time multiplayer Pong with casual, ranked, and offline game modes Matches are played in 2D, and the first player to reach 11 points wins.
  - The AI and offline logic runs entirely in JavaScript on the frontend, so players can keep playing even without a connection.
  - The casual and ranked logic is fully handled by the backend. Only the rendering happens on the frontend, making cheating significantly harder.
  - Game states are cached and synced with Redis, allowing players to reconnect seamlessly after an unexpected client crash.
  - Express backend, chosen for its native Socket.io integration, handling up to 60 exchanges per second between client and server.

- Remote players — Enable two players on separate computers to play the
same game in real-time.
  - Handle network latency and disconnections gracefully.
  - Provide a smooth user experience for remote gameplay.
  - Implement reconnection logic.

**Devops**

- Backend as microservices.
  - Design loosely-coupled services with clear interfaces.
  - Use REST APIs or message queues for communication.
  - Each service should have a single responsibility.

=> 10 majors = 20 pts

**MINORS**

**Web**

- Use an ORM for the database.

- Progressive Web App (PWA) with offline support and installability.

**Accessibility and Internalinalization**

- Support for additional browsers.
  - Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge,
etc.).
  - Test and fix all features in each browser.
  - Document any browser-specific limitations.
  - Consistent UI/UX across all supported browsers.

**User Management**

- Game statistics and match history (requires a game module).
  - Track user game statistics (wins, losses, ranking, level, etc.).
  - Display match history (1v1 games, dates, results, opponents).
  - Show achievements and progression.
  - Leaderboard integration.

- Implement remote authentication with OAuth 2.0 (Google, GitHub, 42,
etc.).

- Implement a complete 2FA (Two-Factor Authentication) system for the
users.

=> 6 minors = 6 pts


## Ressources

- https://jestjs.io/
- https://www.postgresql.org/docs/
- https://redis.io/docs/latest/integrate/
- https://fastify.dev/docs/latest/
- https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- https://react.dev/learn
- https://tailwindcss.com/docs
- https://v6.vite.dev/
- https://grafana.com/docs/
- https://grafana.com/docs/opentelemetry/
- https://prometheus.io/docs/introduction/overview/
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://www.sonarsource.com/fr/integrations/
- https://node.testcontainers.org/quickstart/

### GitHub

- https://github.com/Eveline-Lim/transcendence
