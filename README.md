## Modules

### Minors

- Implement remote authentication with OAuth 2.0 (Google, GitHub, 42,
etc.).
- Game statistics and match history (requires a game module).

- Implement a complete 2FA (Two-Factor Authentication) system for the
users.

- Progressive Web App (PWA) with offline support and installability.

-  Use an ORM for the database.

### Majors

- Standard user management and authentication.

- Introduce an AI Opponent for games.
	- The AI must be challenging and able to win occasionally.
	- The AI should simulate human-like behavior (not perfect play).
	- If you implement game customization options, the AI must be able to use
them.
	- You must be able to explain your AI implementation during evaluation.

- Implement WAF/ModSecurity (hardened) + HashiCorp Vault for secrets:
	- Configure strict ModSecurity/WAF.
	- Manage secrets in Vault (API keys, credentials, environment variables), encrypted and isolated.

- Implement a complete web-based game where users can play against each
other.
	- The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card
games, etc.).
	- Players must be able to play live matches.
	- The game must have clear rules and win/loss conditions.
	- The game can be 2D or 3D.

- Remote players — Enable two players on separate computers to play the
same game in real-time.
	- Handle network latency and disconnections gracefully.
	- Provide a smooth user experience for remote gameplay.
	- Implement reconnection logic.

- Allow users to interact with other users. The minimum requirements are:
	- A basic chat system (send/receive messages between users).
	- A profile system (view user information).
	- A friends system (add/remove friends, see friends list).

- Use a framework for both the frontend and backend.
	- Use a frontend framework (React, Vue, Angular, Svelte, etc.).
	- Use a backend framework (Express, NestJS, Django, Flask, Ruby on Rails,
etc.).
	- Full-stack frameworks (Next.js, Nuxt.js, SvelteKit) count as both if you use
both their frontend and backend capabilities.

-  A public API to interact with the database with a secured API key, rate
limiting, documentation, and at least 5 endpoints:
	- GET /api/{something}
	- POST /api/{something}
	- PUT /api/{something}
	- DELETE /api/{something}

- Implement real-time features using WebSockets or similar technology.
	- Real-time updates across clients.
	- Handle connection/disconnection gracefully.
	- Efficient message broadcasting.

- Backend as microservices.
	- Design loosely-coupled services with clear interfaces.
	- Use REST APIs or message queues for communication.
	- Each service should have a single responsibility.

- Monitoring system with Prometheus and Grafana.
	- Set up Prometheus to collect metrics.
	- Configure exporters and integrations.
	- Create custom Grafana dashboards.
	- Set up alerting rules.
	- Secure access to Grafana.


### Optional

- Major: Advanced permissions system:
	- View, edit, and delete users (CRUD).
	- Roles management (admin, user, guest, moderator, etc.).
	- Different views and actions based on user role.

- Minor: User activity analytics and insights dashboard.

- Major: Multiplayer game (more than two players).
	- Support for three or more players simultaneously.
	- Fair gameplay mechanics for all participants.
	- Proper synchronization across all clients

- Major: Add another game with user history and matchmaking.
	- Implement a second distinct game.
	- Track user history and statistics for this game.
	- Implement a matchmaking system.
	- Maintain performance and responsiveness.


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
