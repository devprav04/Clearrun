#!/usr/bin/env bash
# CleanRun IMMS — Beta deployment script
# Usage: ./deploy.sh [--port 8000] [--workers 3]
set -e

PORT=${PORT:-8000}
WORKERS=${WORKERS:-3}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> CleanRun IMMS — Beta Deployment"
echo "    Dir: $SCRIPT_DIR"

# ── Activate venv ─────────────────────────────────────────────────────────────
if [ -d "$SCRIPT_DIR/venv" ]; then
  source "$SCRIPT_DIR/venv/bin/activate"
fi

cd "$SCRIPT_DIR"

# ── Install / update Python deps ──────────────────────────────────────────────
echo "==> Installing Python dependencies..."
pip install -r requirements.txt -q

# ── Build React frontend ──────────────────────────────────────────────────────
echo "==> Building React frontend..."
cd frontend && npm ci --silent && npm run build && cd ..

# ── Django setup ──────────────────────────────────────────────────────────────
echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

# ── Start Gunicorn ────────────────────────────────────────────────────────────
echo "==> Starting Gunicorn on port $PORT with $WORKERS workers..."
exec gunicorn cleanrun.wsgi:application \
  --bind "0.0.0.0:$PORT" \
  --workers "$WORKERS" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
