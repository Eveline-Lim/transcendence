# Stage 1: Generate gRPC stubs from proto
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY proto/ proto/
RUN mkdir -p generated && \
    python -m grpc_tools.protoc \
        --proto_path=proto \
        --python_out=generated \
        --grpc_python_out=generated \
        proto/ai_opponent_service.proto && \
    touch generated/__init__.py && \
    sed -i 's/^import ai_opponent_service_pb2/from generated import ai_opponent_service_pb2/' \
        generated/ai_opponent_service_pb2_grpc.py

# Stage 2: Runtime image
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir grpcio protobuf

# Copy application code
COPY engine/ engine/
COPY service/ service/
COPY config/ config/
COPY server.py .

# Copy generated stubs from builder stage
COPY --from=builder /build/generated/ generated/

# Create __init__.py files
RUN touch engine/__init__.py service/__init__.py config/__init__.py

# Non-root user for security
RUN useradd --create-home appuser
USER appuser

EXPOSE 50051

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD python -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('localhost', 50051)); s.close()" || exit 1

ENTRYPOINT ["python", "-u", "server.py"]
