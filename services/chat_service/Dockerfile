# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM rust:1.94-slim AS builder

WORKDIR /app

# Install only what the linker needs (reqwest/openssl may pull native TLS).
RUN apt-get update && \
    apt-get install -y --no-install-recommends pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Cache dependency compilation: copy manifests first, create a dummy main,
# build once, then replace with the real source.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && \
    echo 'fn main() {}' > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/chat_service*

# Now copy the real source and build.
COPY src/ src/
RUN cargo build --release

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates libssl3 curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user for security.
RUN groupadd --system app && useradd --system --gid app app
USER app

COPY --from=builder /app/target/release/chat_service /usr/local/bin/chat_service

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["chat_service"]
