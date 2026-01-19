*This project has been created as part of the 42 curriculum by [Bill], [Teammate1], [Teammate2].*

# ft_transcendence

## Description

**ft_transcendence** is the final project of the Common Core at 42. It is a robust single-page application (SPA) featuring a real-time multiplayer Pong game, a sophisticated chat system, and comprehensive user profile management.

The goal of this project is to integrate a wide array of modern web technologies to build a complete, production-grade web platform. Key features include:
- **Real-time Multiplayer Pong**: Play against other users or an AI opponent with live updates.
- **Social Interaction**: Chat with friends, block users, and manage friend lists.
- **Security**: Robust authentication (2FA, OAuth), vault-managed secrets, and WAF protection.
- **Microservices Architecture**: Scalable backend services monitored via Prometheus and Grafana.

## Documentation

### Architecture
- [Global View](docs/architectures/global-view.md)
- [API Documentation](docs/api/)

### User Stories (Scrum)
- [Authentication & Security](docs/scrum/userStory_authentication.md)
- [Profile Management](docs/scrum/userStory_profile_management.md)
- [Chat with Friends](docs/scrum/userStory_chat_with_friends.md)
- [Match Queue (PvP)](docs/scrum/userStory_match_queue.md)
- [Play against AI](docs/scrum/userStory_play_against_IA.md)

## Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local development)
- Make

### Installation & Execution
1. **Clone the repository:**
   ```bash
   git clone https://github.com/user/transcendence.git
   cd transcendence
   ```

2. **Environment Setup:**
   Create a `.env` file at the root based on `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your specific API keys and credentials
   ```

3. **Run with Docker:**
   ```bash
   make up
   # Or directly: docker-compose up --build
   ```

4. **Access the Application:**
   Open your browser and navigate to `https://localhost` (Self-signed certificate, accept the warning).
   - Frontend: `https://localhost`
   - Grafana: `https://localhost:3000`

## Resources

### References
- [React Documentation](https://react.dev/learn)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Integration](https://redis.io/docs/latest/integrate/)
- [Traefik Docker Provider](https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/)
- [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jest](https://jestjs.io/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite](https://v6.vite.dev/)
- [GitHub Action](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)

### AI Usage
AI tools (GitHub Copilot, ChatGPT) were used in this project for:
- **Documentation**: Drafting Scrum user stories and API documentation (Swagger/OpenAPI/AsyncAPI).
- **Debugging**: analyzing stack traces and suggesting optimized queries for PostgreSQL.

## Team Information

| Member | Role | Responsibilities |
| :--- | :--- | :--- |
| **[TEST]** | Tech Lead / Backend | Microservices architecture, API Gateway, DevOps, and Database design. |
| **[TEST2]** | Frontend Developer | UI/UX implementation, React components, Game Canvas rendering. |
| **[TEST3]** | Full Stack / QA | AI logic, Chat service, Testing (Jest), and CI/CD pipelines. |

## Project Management

- **Methodology**: Scrum-like Agile workflow with weekly sprints.
- **Tools**: GitHub Projects (Kanban board) for task tracking.
- **Communication**: Discord server with dedicated channels for #frontend, #backend, and #general.

## Technical Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **State Management**: Context API / Redux
- **Real-time**: Socket.io-client

### Backend
- **Framework**: Fastify (Node.js) - chosen for high performance and low overhead.
- **Language**: TypeScript - for type safety across services. Python TODO
- **Communication**: REST API (HTTP) & WebSockets & gRPC.

### Database
- **PostgreSQL**: Primary relational database for user data, match history, and friends. Chosen for reliability and structured data integrity.
- **Redis**: In-memory store for session caching, matchmaking queues, and real-time game state.

### Infrastructure
- **Docker & Docker Compose**: Containerization.
- **Traefik**: Reverse Proxy & Load Balancer.
- **ModSecurity**: WAF (Web Application Firewall).
- **HashiCorp Vault**: Secrets management.
- **Prometheus & Grafana**: Monitoring and Observability.

## Database Schema

*(Placeholder for visual representation)*

## Features List

....

## Modules

**Total Points:** 27

### Major Modules (2 pts each)
1.  **Standard User Management**: Auth, Register, Login.
2.  **AI Opponent**: Server-side AI calculation with adjustable difficulty.
3.  **Security (WAF/Vault)**: ModSecurity for request filtering, Vault for secure key storage.
4.  **Web-based Game**: Pong implementation with collision detection.
5.  **Remote Players**: WebSocket-based multiplayer synchronization.
6.  **Social Interactions**: Chat, Friends, Profiles.
7.  **Frameworks**: React (Frontend) + Fastify (Backend).
8.  **Public API**: Documented REST endpoints with security and rate limiting.
9.  **Real-time Features**: WebSockets for game state and chat.
10. **Microservices**: Separation of concerns (Auth, Game, Chat, User services).
11. **Monitoring**: Prometheus scraping metrics + Grafana dashboards.

### Minor Modules (1 pt each)
1.  **OAuth 2.0**: Integration with 42 API and Google.
2.  **Game Statistics**: Win rates, match history tracking.
3.  **Two-Factor Authentication (2FA)**: TOTP based (Google Authenticator).
4.  **Progressive Web App (PWA)**: Manifest, Service Workers for offline capabilities.
5.  **ORM Usage**: Prisma/TypeORM for database interactions.

## Individual Contributions

### [Eveline]
- Auth

### [Christopher]
- Game engine

### [Thomas]
- Security

### [Kamel]
- IA

### [Mathieu]
- Archi
