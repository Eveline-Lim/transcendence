*This project has been created as part of the 42 curriculum by
	evlim,
	thbasse,
	hsoysal,
	kahoumou,
	ckenaip.*

---

# 🏓 ft_transcendence

## Table of Contents

- [Description](#description)
- [Instructions](#instructions)
- [Team Information](#team-information)
- [Project Management](#project-management)
- [Technical Stack](#technical-stack)
- [Database Schema](#database-schema)
- [Features List](#features-list)
- [Modules](#modules)
- [Individual Contributions](#individual-contributions)
- [Resources](#resources)

---


## Description

ft_transcendence is a full-stack web application built around a real-time Pong game. Players can compete online against other players, challenge an AI opponent, or play locally in offline mode. The project features a React frontend, a TypeScript/Node.js backend powered by Fastify and Express, real-time communication via Socket.io, and Redis for state management.

---

## Instructions

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

### Key Features

- 👤 User registration, login and profile management
- 🎮 Real-time 1v1 Pong matches
- 🔐 JWT-based authentication with OAuth 2.0 via the 42 API
- 🛡️ Two-factor authentication (2FA) via TOTP
- 👥 Friend system with online status
- 📊 Match statistics, rankings and leaderboard
- 🤖 AI opponent with adjustable difficulty
- 🌐 Single-Page Application (no full page reloads)

---

## Team Information

| Login | Role | Responsibilities |
|---|---|---|
| evlim | Product Owner, Developer | |
| ckenaip | Project Manager, Developer | |
| hsoysal | Technical Lead, Developer |  |
| kahoumou | Developer | |
| thbasse | Developer |  |

---
## Project Management

### Tools

- **GitHub Pull Requests** — all code reviewed by at least one other team member before merge
- **Documentation** — https://eveline-lim.github.io/transcendence/ |

### Communication

Discord server with dedicated channels per service

---

## Technical Stack

### Frontend

| Technology | Purpose |
|---|---|
| React | SPA framework |
| Tailwind CSS | Styling |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime |
| **Fastify** | Auth service |
| **Express** | Game service |

### Database

| Technology |
|---|
| **Redis** |
| **PostgreSQL** |

---

## Database Schema

---

## Features List

| Feature | Description | Implemented by |
|---|---|---|
| **User registration** | Create an account with username, display name, email and password | evlim |
| **Email/username login** | Authenticate with credentials, receive JWT + refresh token | evlim |
| **JWT Access Token** | Short-lived signed token (Bearer) | evlim |
| **Refresh Token** | Refresh token stored in Redis, revoked on logout | hsoysal |
| **OAuth 2.0 (42)** | Login via 42 intranet | evlim |
| **Two-Factor Authentication (2FA)** | TOTP-based 2FA using an authenticator app. Setup returns QR code + backup codes | evlim |
| **Password Reset** | Sends a one-time reset link via email | evlim |
| **Password Change** | Authenticated users can change their password | evlim |
| **Session Management** | List all active sessions with device/IP info; revoke individual sessions or all at once | evlim |
| **Logout** | Invalidates the current session and blacklists the refresh token | evlim |
| **Player profile** | Edit profile, delete account | hsoysal |
| **Friend system** | Add/remove/block friends | hsoysal |
| **Leaderboard** | Global ranking by win rate | hsoysal |
| **Real-time Pong** | Live 1v1 game | ckenaip |
| **Matchmaking** | Automatic queue-based opponent pairing | hsoysal |
| **AI opponent** | Adjustable difficulty AI | kahoumou |
| **WAF/ModSecurity** | | thbasse |
| **Responsive SPA** | Single-page app, works on desktop and mobile | hsoysal |

---

## Modules

Total: **10** Major × 2 + **6** Minor × 1 = 26 pts

### Major Modules (2 pts each)

#### Web

- Use a framework for both the frontend and backend.
◦ Use a frontend framework (React, Vue, Angular, Svelte, etc.).
◦ Use a backend framework (Express, NestJS, Django, Flask, Ruby on Rails,
etc.).
◦ Full-stack frameworks (Next.js, Nuxt.js, SvelteKit) count as both if you use both their frontend and backend capabilities.

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

  => Check for more details: https://eveline-lim.github.io/transcendence/

**User Management**

- Standard user management and authentication.
  - Users can update their profile information.
  - Users can upload an avatar (with a default avatar if none provided).
  - Users can add other users as friends and see their online status.
  - Users have a profile page displaying their information.

**Module implementation details**:

User management is handled by two services: auth-service and player-service.

  - **Registration and login** (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`) allow users to create an account or sign in using a username, display name, email and password. Passwords must be at least 8 characters and contain uppercase, lowercase, numeric and special characters. On success, both endpoints return a short-lived JWT access token (Bearer) and a longer-lived refresh token, along with the user's information.

  - **Token management** is handled through a refresh endpoint (`POST /api/v1/auth/refresh`). The access token is verified via `GET /api/v1/auth/verify`. Tokens are stored in Redis and are invalidated on logout (`POST /api/v1/auth/logout`), which blacklists the current token.

  - **Password management** covers three flows: a forgot-password flow that emails a one-time reset link (`POST /api/v1/auth/password/forgot` → `POST /api/v1/auth/password/reset`) and a change-password flow for authenticated users (`POST /api/v1/auth/password/change`) that requires the current password for confirmation.

  - **Player profile** is managed by the player-service. Authenticated users can retrieve their own profile (`GET /api/v1/players/me`), update their display name and email (`PATCH /api/v1/players/me`), upload or remove an avatar image (`PUT/DELETE /api/v1/players/me/avatar`) and delete their account (`DELETE /api/v1/players/me`).

  - **Friends** are also handled by the player-service. Users can send, accept or decline friend requests (`POST /api/v1/players/me/friends/requests`). They can also remove friends and block or unblock other players.

  -- **Session management** allows users to see all their active sessions with device and IP information (`GET /api/v1/auth/sessions`). They can revoke a specific session (`DELETE /api/v1/auth/sessions/{sessionId}`) or revoke all sessions at once.

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
  - The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card
games, etc.).
  - Players must be able to play live matches.
  - The game must have clear rules and win/loss conditions.
  - The game can be 2D or 3D.

**Module implementation details**:
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

### Minor Modules (1 pt each)

**Web**

- Use an ORM for the database. (?)

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

**Module implementation details**:

The 42 provider was chosen over Google or GitHub. Since the main users of this project already have 42 accounts, using the 42 intranet for authentication made the most sense. It also shows how the app can connect to a real identity provider without asking users to create or trust another password system.

The OAuth flow is implemented in the auth service using two endpoints that follow the standard authorization code flow:

1. **`GET /api/v1/auth/oauth/fortytwo`** — Starts the login process by redirecting the user to the 42 authorization server. A `state` parameter is generated server-side and stored temporarily to prevent CSRF attacks.

2. **`GET /api/v1/auth/oauth/fortytwo/callback`** — Receives the `code` and `state` from 42 after the user approves access. The service validates the `state`, exchanges the `code` for an access token with 42's token endpoint, fetches the user's profile from the 42 API and either creates a new local account or links it to an existing one.

The provider routing is generic (`/auth/oauth/{provider}`) with `"fortytwo"` currently used as the provider, meaning the infrastructure can support additional providers (Google, GitHub) without architectural changes.

- Implement a complete 2FA (Two-Factor Authentication) system for the users.

**Module implementation details**:

Passwords alone are insufficient protection for user accounts. This project adds 2FA using TOTP (Time-Based One-Time Passwords). It adds a second factor that is time-sensitive and device-bound. Backup codes are also provided alongside the TOTP secret. It ensure users can still access their account if they lose their authenticator app.

2FA is implemented as a TOTP system compatible with standard authenticator apps (Google Authenticator etc.). The 2FA process is divided into three main steps:

**Setup** (`POST /api/v1/auth/2fa/enable`) — Callable by an authenticated user who does not yet have 2FA enabled. It returns a `secret`, a `qrCodeUrl` (an `otpauth://` URI rendered as a QR code for scanning) and a set of one-time `backupCodes`. The 2FA is not yet active until the user completes verification.

**Verification** (`POST /api/v1/auth/2fa/verify`) — The user submits a 6-digit TOTP code (`^[0-9]{6}$`) from their authenticator app. This endpoint serves two purposes: confirming the setup and completing login for users who already have 2FA enabled. On a successful login verification, it returns a full token pair, identical to a normal login response. If a login attempt is for an account with 2FA enabled, the initial login response sets `requires2FA: true` and the tokens will only be provided after this step.

**Disabling** (`POST /api/v1/auth/2fa/disable`) — To disable 2FA, the user must provide both their current TOTP code and their account password for confirmation before disabling, preventing an attacker with a stolen access token from disabling 2FA.

The `has2FAEnabled` boolean is included in the user object returned by all auth endpoints, allowing the frontend to conditionally render the 2FA step.

---

## Individual Contributions


---

## Resources


### Frontend
- https://react.dev/learn
- https://v6.vite.dev/
- https://tailwindcss.com/docs

### Backend
- https://fastify.dev/docs/latest/


### Databases
- https://www.postgresql.org/docs/
- https://redis.io/docs/latest/integrate/

### GitHub
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

### Oauth
- https://api.intra.42.fr/apidoc/guides/getting_started
- https://api.intra.42.fr/apidoc/guides/web_application_flow


(?)
- https://jestjs.io/
- https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- https://grafana.com/docs/
- https://grafana.com/docs/opentelemetry/
- https://prometheus.io/docs/introduction/overview/
- https://www.sonarsource.com/fr/integrations/
- https://node.testcontainers.org/quickstart/
