# 🌐 Gateway Service — Nginx + ModSecurity + OWASP CRS v4

> Secure reverse proxy and single entry point for the microservices architecture.
> Handles TLS termination, JWT authentication, WebSocket routing and WAF protection.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [TLS Termination](#tls-termination)
- [WAF – ModSecurity + OWASP CRS](#waf--modsecurity--owasp-crs)
- [JWT Authentication](#jwt-authentication)
- [Routing Table](#routing-table)
- [DNS Resolution](#dns-resolution)
- [Health Check](#health-check)
- [Security Layers](#security-layers)
- [File Structure](#file-structure)
- [Location Priority](#location-priority)

---

## Overview

The **Gateway** service is a hardened Nginx reverse proxy protected by the **ModSecurity WAF** and **OWASP Core Rule Set v4**.
It acts as the **sole entry point** for the entire application and is responsible for:

- Redirecting HTTP traffic to HTTPS
- Terminating TLS using Docker secrets
- Validating JWT tokens before forwarding requests to backend services
- Routing REST and WebSocket traffic to the appropriate microservice
- Blocking malicious requests via the OWASP CRS WAF

---

## Architecture

```
                         Internet
                            │
                     ┌──────┴──────┐
                     │   :8080     │  HTTP  ──→  301 Redirect → HTTPS
                     │   :8443     │  HTTPS ──→  Reverse Proxy
                     │             │
                     │   GATEWAY   │  ModSecurity WAF
                     │   (Nginx)   │  JWT Validation
                     └──────┬──────┘
                            │
         ┌──────────────────┼────────────────────────────┐
         │                  │                │            │
   ┌─────┴─────┐    ┌───────┴────┐   ┌──────┴────┐  ┌───┴──────┐
   │  Frontend │    │    Auth    │   │  Player   │  │   Chat   │
   │    :80    │    │   :3000    │   │   :8080   │  │  :3000   │
   └───────────┘    └────────────┘   └───────────┘  └──────────┘
         ┌──────────────────┬──────────────┐
   ┌─────┴─────┐    ┌───────┴────┐
   │   Game    │    │   Match    │
   │   :3001   │    │   :8080    │
   └───────────┘    └────────────┘
```

---

## TLS Termination

| Parameter        | Value                       |
|------------------|-----------------------------|
| **HTTP Port**    | `8080`                      |
| **HTTPS Port**   | `8443`                      |
| **Certificate**  | `/run/secrets/ssl_cert`     |
| **Private Key**  | `/run/secrets/ssl_key`      |

All HTTP traffic on port `8080` is **permanently redirected (301)** to HTTPS on port `8443`,
except for the `/health` endpoint.

```
http://host:8080/any/path  →  301  →  https://host:8443/any/path
```

> Certificates are mounted via **Docker secrets** and are never baked into the image.

---

## WAF – ModSecurity + OWASP CRS

### Docker Build (Multi-stage)

The WAF is compiled across **two stages** in the Dockerfile:

| Stage            | Action                                                                              |
|------------------|-------------------------------------------------------------------------------------|
| **Stage 1** (builder) | Compiles ModSecurity v3, the Nginx connector module, and downloads OWASP CRS v4 rules |
| **Stage 2** (final)   | Lightweight Nginx Alpine image with only the required build artifacts copied over     |

### ModSecurity Configuration (`modsecurity.conf`)

| Directive                        | Value              | Description                                    |
|----------------------------------|--------------------|------------------------------------------------|
| `SecRuleEngine`                  | `On`               | Active enforcement mode — blocks malicious requests |
| `SecRequestBodyAccess`           | `On`               | Enables request body inspection                |
| `SecRequestBodyLimit`            | `13,107,200` (12.5 MB) | Max body size including file uploads       |
| `SecRequestBodyNoFilesLimit`     | `131,072` (128 KB) | Max body size excluding file uploads           |
| `SecResponseBodyAccess`          | `On`               | Enables response body inspection               |
| `SecAuditEngine`                 | `RelevantOnly`     | Logs only 4xx/5xx responses                    |
| `SecAuditLogFormat`              | `JSON`             | Structured log format for easy parsing         |
| `SecDebugLogLevel`               | `0`                | Debug logging disabled in production           |

### CRS Configuration (`crs-setup.conf`)

| Parameter                     | Value | Description                                           |
|-------------------------------|-------|-------------------------------------------------------|
| **Paranoia Level**            | `1`   | Basic level — minimises false positives               |
| **Inbound Anomaly Threshold** | `5`   | Score threshold before blocking incoming requests     |
| **Outbound Anomaly Threshold**| `4`   | Score threshold before blocking outgoing responses    |
| **Allowed HTTP Methods**      | `GET HEAD POST OPTIONS PUT DELETE` | Permitted HTTP verbs      |
| **Allowed Content-Types**     | `form-urlencoded, multipart, xml, json` | Accepted MIME types  |
| **Max Arguments**             | `255` | Maximum number of request parameters allowed          |

### ModSecurity Rule Exceptions

Some routes require **specific rules to be disabled** to avoid false positives:

| Route                             | Disabled Rule | Reason                                         |
|-----------------------------------|---------------|------------------------------------------------|
| `/api/v1/players/*`               | `949110`      | Allows `PATCH` requests (profile updates)      |
| `/api/v1/auth/sessions/{id}`      | `949110`      | Allows `DELETE` requests (session revocation)  |

> Rule **949110** is the CRS final inbound anomaly scoring rule. It blocks requests whose
> cumulative anomaly score exceeds the configured threshold. HTTP methods such as `PATCH`
> or `DELETE` can trigger multiple detection rules that together exceed this threshold.

---

## JWT Authentication

The gateway delegates JWT token validation to **auth_service** using Nginx's `auth_request` module.

### Two Validation Modes

```
┌────────────────────────────────────────────────────┐
│              Incoming Request                      │
│                                                    │
│  REST API ?  ──→  Header: Authorization: Bearer   │
│                   ──→  /_validate_jwt              │
│                                                    │
│  WebSocket ? ──→  Query param: ?token=xxx          │
│                   ──→  /_validate_jwt_ws           │
└────────────────────────────────────────────────────┘
```

#### REST API (`/_validate_jwt`)

```
Client → Gateway → auth_service GET /auth/verify
                    Header: Authorization: Bearer <token>
                    ←── 200 + X-User-Id, X-Username
         Gateway → Target service (with injected identity headers)
```

The `Authorization` header is forwarded as-is from the original client request.

#### WebSocket (`/_validate_jwt_ws`)

```
Client → wss://host/ws/chat?token=<jwt>
         Gateway → builds "Bearer <token>"
                 → auth_service GET /auth/verify
                   Header: Authorization: Bearer <token>
                   ←── 200 + X-User-Id, X-Username
         Gateway → Target service (with identity headers + WS upgrade)
```

The token is extracted from the `$arg_token` query parameter.
The `$validate_bearer` variable is set in the parent `location` block and inherited by the subrequest.

### Injected Identity Headers

After successful validation, the gateway injects the following headers into backend requests:

| Header           | Source                            | Description                              |
|------------------|-----------------------------------|------------------------------------------|
| `X-User-Id`      | `$upstream_http_x_user_id`        | Authenticated user's unique ID           |
| `X-Username`     | `$upstream_http_x_username`       | Authenticated user's username            |
| `X-Avatar-Url`   | `$upstream_http_x_avatar_url`     | User's avatar URL (`/ws/match` only)     |

---

## Routing Table

### Public Routes (no JWT required)

| Method | Route             | Target Service        | Description                         |
|--------|-------------------|-----------------------|-------------------------------------|
| `GET`  | `/health`         | —                     | Health check endpoint (`200 healthy`) |
| `*`    | `/api/v1/auth/*`  | `auth_service:3000`   | Registration, login, token refresh  |
| `*`    | `/`               | `frontend:80`         | Frontend SPA (catch-all fallback)   |

### Protected Routes (JWT required via Authorization header)

| Method | Route                          | Target Service         | URL Rewrite                            | Description                    |
|--------|--------------------------------|------------------------|----------------------------------------|--------------------------------|
| `*`    | `/api/v1/players/*`            | `player_service:8080`  | —                                      | Player profile management      |
| `*`    | `/api/v1/chat/*`               | `chat_service:3000`    | `/api/v1/(.*)` → `/$1`                 | Chat REST API                  |
| `*`    | `/api/v1/game/*`               | `game_service:3001`    | `/api/v1/game/(.*)` → `/api/$1`        | Game REST API                  |
| `*`    | `/api/v1/*`                    | `player_service:8080`  | —                                      | Protected catch-all            |
| `DELETE` | `/api/v1/auth/sessions/{id}` | `auth_service:3000`  | `/api/v1/(.*)` → `/$1`                 | Single session revocation      |

### WebSocket Routes (JWT required via `?token=` query param)

| Route          | Target Service        | Description                   |
|----------------|-----------------------|-------------------------------|
| `/ws/chat`     | `chat_service:3000`   | Real-time chat                |
| `/ws/match`    | `match_service:8080`  | Real-time matchmaking         |
| `/socket.io/*` | `game_service:3001`   | Real-time game (Socket.IO)    |

> All WebSocket connections have a **3600s timeout** (1 hour) for both read and write operations.

### Static Files

| Route                      | Local Path                   | Description          |
|----------------------------|------------------------------|----------------------|
| `/uploads/avatars/{file}`  | `/app/uploads/avatars/{file}`| User avatar images   |

- `Cache-Control: no-cache, must-revalidate` ensures updated avatars are always served fresh.
- ETags are enabled for conditional revalidation (`If-None-Match`).
- A trailing slash in the URL is redirected (301) to the canonical URL.

---

## DNS Resolution

```nginx
resolver 127.0.0.11 valid=30s ipv6=off;
```

| Parameter    | Value         | Description                        |
|--------------|---------------|------------------------------------|
| **Resolver** | `127.0.0.11`  | Docker internal DNS                |
| **TTL**      | `30s`         | DNS cache duration                 |
| **IPv6**     | `off`         | Disabled (Docker network is IPv4)  |

Upstream addresses are defined as **Nginx variables** (`set $player_upstream ...`),
which forces DNS resolution **at request time** rather than at startup.
This allows backend containers to restart or scale without requiring a gateway reload.

---

## Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

| Parameter              | Value        |
|------------------------|--------------|
| Interval               | 30 seconds   |
| Timeout                | 10 seconds   |
| Start period           | 10 seconds   |
| Retries before `unhealthy` | 3        |
| Endpoint               | `http://localhost:8080/health` |

---

## Security Layers

```
┌──────────────────────────────────────────┐
│  1. HTTP → HTTPS Redirect (TLS)         │
├──────────────────────────────────────────┤
│  2. WAF — ModSecurity + OWASP CRS v4    │
│     • SQL Injection                      │
│     • Cross-Site Scripting (XSS)         │
│     • Path Traversal                     │
│     • Command Injection                  │
│     • Scanner / Bot Detection            │
├──────────────────────────────────────────┤
│  3. JWT Authentication                   │
│     • Validated via auth_service         │
│     • Identity injected into headers     │
├──────────────────────────────────────────┤
│  4. Non-root Container User              │
│     • Process runs as `nonroot`          │
├──────────────────────────────────────────┤
│  5. Docker Secrets                       │
│     • TLS certificates mounted at        │
│       /run/secrets/ — never in image     │
└──────────────────────────────────────────┘
```

### Path Traversal Protection (Avatar Files)

The `[^/]+` regex in avatar location blocks **prevents any directory traversal**:

```nginx
# [^/]+ forbids any "/" character inside the filename
location ~* ^/uploads/avatars/([^/]+\.(?:jpg|jpeg|png|gif|webp|svg))$
```

---

## File Structure

```
gateway/
├── Dockerfile                  # Multi-stage build (ModSecurity + Nginx)
├── conf/
│   └── default.conf            # Nginx virtual host configuration (routing, auth, WAF)
├── modsecurity/
│   └── modsecurity.conf        # ModSecurity engine config + CRS include
└── nginx.conf                  # Main Nginx configuration (module loading, worker settings)
```

### Key Paths Inside the Container

| Path                                    | Description                              |
|-----------------------------------------|------------------------------------------|
| `/etc/nginx/conf.d/default.conf`        | Route definitions and proxy configuration |
| `/etc/modsecurity/modsecurity.conf`     | ModSecurity configuration                |
| `/etc/modsecurity/crs/`                 | OWASP CRS rules                          |
| `/etc/modsecurity/unicode.mapping`      | Unicode mapping file for ModSecurity     |
| `/var/log/modsecurity/`                 | WAF audit logs                           |
| `/tmp/modsecurity/`                     | Temporary files (tmp, data, upload)      |
| `/run/secrets/ssl_cert`                 | TLS certificate (Docker secret)          |
| `/run/secrets/ssl_key`                  | TLS private key (Docker secret)          |
| `/app/uploads/avatars/`                 | Avatar image files (shared volume)       |

---

## Location Priority

Nginx evaluates location blocks in a specific order. The effective priority for this service is:

```
1.  = /_validate_jwt                (exact match — internal JWT validation subrequest)
2.  = /_validate_jwt_ws             (exact match — internal WS JWT validation subrequest)
3.  ~* ^/uploads/avatars/…/         (regex — redirect trailing slash on avatar URLs)
4.  ~* ^/uploads/avatars/…          (regex — serve avatar static files)
5.  ~* ^/api/v1/players/            (regex — player service, ModSecurity exception)
6.  ~* ^/api/v1/auth/sessions/…     (regex — session DELETE, ModSecurity exception)
7.  /api/v1/chat/                   (prefix — chat REST API, JWT protected)
8.  /api/v1/game/                   (prefix — game REST API, JWT protected)
9.  /api/v1/auth/                   (prefix — auth endpoints, public)
10. /api/v1/                        (prefix — catch-all protected API)
11. /ws/chat                        (prefix — WebSocket chat)
12. /ws/match                       (prefix — WebSocket matchmaking)
13. /socket.io/                     (prefix — Socket.IO game endpoint)
14. /health                         (prefix — health check)
15. /                               (prefix — frontend SPA fallback)
```

---

> **Note:** ModSecurity is disabled (`modsecurity off`) on the internal `/_validate_jwt` and
> `/_validate_jwt_ws` locations to avoid unnecessary overhead on subrequests that never
> receive external traffic.
