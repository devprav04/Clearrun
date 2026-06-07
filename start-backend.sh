#!/usr/bin/env bash
# CleanRun IMMS — Start backend + Cloudflare Tunnel
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d "$SCRIPT_DIR/venv" ]; then
  source "$SCRIPT_DIR/venv/bin/activate"
fi

echo "==> Applying migrations..."
python manage.py migrate --noinput

echo "==> Starting Gunicorn on http://0.0.0.0:8000 ..."
gunicorn cleanrun.wsgi:application \
  --bind "0.0.0.0:8000" \
  --workers 3 \
  --timeout 120 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  --daemon

echo "==> Starting Cloudflare Tunnel..."
~/.local/bin/cloudflared tunnel --url http://localhost:8000 \
  --logfile /tmp/cf.log --no-autoupdate &

sleep 4
CF_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cf.log | tail -1)
echo ""
echo "    Tunnel URL: $CF_URL"
echo ""
echo "  If this URL changed since last time, run:"
echo "    bash update-url.sh"
echo ""
echo "  Frontend: https://frontend-xenory.vercel.app"
