#!/usr/bin/env bash
# CleanRun IMMS — Start backend for beta testing
# Runs Gunicorn on port 8000. Run ngrok separately in another terminal.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d "$SCRIPT_DIR/venv" ]; then
  source "$SCRIPT_DIR/venv/bin/activate"
fi

echo "==> Applying migrations..."
python manage.py migrate --noinput

echo "==> Starting Gunicorn on http://0.0.0.0:8000 ..."
echo ""
echo "  In a SECOND terminal, run:"
echo "    ngrok http 8000"
echo ""
echo "  Then:"
echo "  1. Copy the ngrok HTTPS URL (e.g. https://abc123.ngrok-free.app)"
echo "  2. Paste it into frontend/.env.production as:"
echo "       VITE_API_URL=https://abc123.ngrok-free.app/api/"
echo "  3. Add it to .env CORS_ALLOWED_ORIGINS"
echo "  4. Rebuild & redeploy frontend to Vercel"
echo ""

exec gunicorn cleanrun.wsgi:application \
  --bind "0.0.0.0:8000" \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
