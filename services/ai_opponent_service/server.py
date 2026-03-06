
import asyncio
import logging
import signal
import sys
import os

import grpc

from generated import ai_opponent_service_pb2_grpc as pb2_grpc
from service.ai_service import AIOpponentServicer

DEFAULT_PORT = 50051


def configure_logging() -> None:
   
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )


async def serve() -> None:
    configure_logging()
    logger = logging.getLogger(__name__)

    port = int(os.environ.get("GRPC_PORT", DEFAULT_PORT))

    server = grpc.aio.server()
    pb2_grpc.add_AIOpponentServiceServicer_to_server(
        AIOpponentServicer(), server
    )
    server.add_insecure_port(f"[::]:{port}")

    # Graceful shutdown using loop.add_signal_handler (works with asyncio)
    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_event.set)

    await server.start()
    logger.info("AI Opponent service started on port %d", port)

    await shutdown_event.wait()

    logger.info("Shutting down gracefully (5s grace period)...")
    await server.stop(grace=5.0)
    logger.info("Server stopped.")


if __name__ == "__main__":
    asyncio.run(serve())
