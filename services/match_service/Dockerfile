FROM rust:1.92-slim AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock* ./

RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    echo "" > src/lib.rs && \
    cargo build --release 2>/dev/null || true && \
    rm -rf src

COPY src/ src/

RUN cargo build --release --bin match_service

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/match_service /usr/local/bin/match_service

ENV RUST_LOG=info

EXPOSE 8080

ENTRYPOINT ["match_service"]
CMD ["0.0.0.0:8080"]
