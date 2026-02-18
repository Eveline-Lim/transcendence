FROM docker.io/rust:1.92-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    echo "" > src/lib.rs && \
    echo "fn main() {}" > src/client.rs && \
    cargo build --release && \
    rm -rf src

COPY src/ src/

RUN touch src/main.rs src/lib.rs

RUN cargo build --release --bin match_service

FROM scratch

COPY --from=builder /app/target/release/match_service /match_service

ENV RUST_LOG=info

EXPOSE 8080

ENTRYPOINT ["/match_service"]
CMD ["0.0.0.0:8080"]