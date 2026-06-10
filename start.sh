#!/bin/sh
set -e
LISTEN_PORT="${PORT:-8080}"
echo "Starting uvicorn on port: $LISTEN_PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$LISTEN_PORT"
