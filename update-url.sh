#!/usr/bin/env bash
# Run once after PC restart — updates backend URL, restarts Gunicorn, rebuilds and redeploys frontend.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Fetching current Cloudflare Tunnel URL..."
sleep 3
CF_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cf.log 2>/dev/null | tail -1)

if [ -z "$CF_URL" ]; then
  echo "ERROR: Could not read tunnel URL from /tmp/cf.log"
  echo "  Make sure cloudflared is running:"
  echo "    ~/.local/bin/cloudflared tunnel --url http://localhost:8000 --logfile /tmp/cf.log &"
  exit 1
fi

echo "    URL: $CF_URL"

CURRENT=$(grep "VITE_API_URL" frontend/.env.production | cut -d= -f2 | sed 's|/api/||')

if [ "$CURRENT" = "$CF_URL" ]; then
  echo "==> URL unchanged — no rebuild needed."
  exit 0
fi

echo "==> URL changed ($CURRENT → $CF_URL)"
DOMAIN=$(echo "$CF_URL" | sed 's|https://||')

# Update frontend/.env.production
sed -i "s|VITE_API_URL=.*|VITE_API_URL=$CF_URL/api/|" frontend/.env.production

# Update .env
python3 - <<PYEOF
import re
with open('.env') as f:
    content = f.read()

# Replace old tunnel domain in ALLOWED_HOSTS
content = re.sub(r'[a-z0-9-]+\.trycloudflare\.com', '$DOMAIN', content)

# Replace old tunnel URL in CORS_ALLOWED_ORIGINS
content = re.sub(r'https://[a-z0-9-]+\.trycloudflare\.com', '$CF_URL', content)

with open('.env', 'w') as f:
    f.write(content)
print('  .env updated')
PYEOF

echo "==> Restarting Gunicorn..."
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user restart cleanrun-gunicorn

echo "==> Building frontend..."
cd frontend && npm run build --silent

echo "==> Deploying to Vercel..."
npx vercel deploy --prod 2>&1 | grep -E "Aliased|Production|Error"

echo ""
echo "Done! Frontend live at: https://frontend-xenory.vercel.app"
