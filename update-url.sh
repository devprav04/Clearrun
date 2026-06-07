#!/usr/bin/env bash
# Run this once after PC restart if ngrok URL has changed.
# It updates CORS, rebuilds frontend, and redeploys to Vercel automatically.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Fetching current ngrok URL..."
sleep 3  # give ngrok time to connect
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c \
  "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])")

if [ -z "$NGROK_URL" ]; then
  echo "ERROR: Could not get ngrok URL. Is the service running?"
  echo "  Check: systemctl --user status cleanrun-ngrok"
  exit 1
fi

echo "    URL: $NGROK_URL"

# Read current URL from .env.production
CURRENT=$(grep "VITE_API_URL" frontend/.env.production | cut -d= -f2 | sed 's|/api/||')

if [ "$CURRENT" = "$NGROK_URL" ]; then
  echo "==> URL unchanged — no rebuild needed."
  echo "    Frontend is already pointing to $NGROK_URL"
  exit 0
fi

echo "==> URL changed ($CURRENT → $NGROK_URL)"

# Update frontend/.env.production
sed -i "s|VITE_API_URL=.*|VITE_API_URL=$NGROK_URL/api/|" frontend/.env.production

# Update .env CORS
DOMAIN=$(echo "$NGROK_URL" | sed 's|https://||')
python3 -c "
import re
with open('.env') as f: content = f.read()
# Add new ngrok URL to CORS if not already there
if '$NGROK_URL' not in content:
    content = re.sub(
        r'(CORS_ALLOWED_ORIGINS=.*)',
        lambda m: m.group(1) + ',$NGROK_URL',
        content
    )
    with open('.env', 'w') as f: f.write(content)
    print('  CORS updated')
else:
    print('  CORS already has this URL')
"

# Update ALLOWED_HOSTS in .env
python3 -c "
with open('.env') as f: content = f.read()
if '$DOMAIN' not in content:
    content = content.replace(
        'ALLOWED_HOSTS=',
        'ALLOWED_HOSTS=$DOMAIN,'
    )
    with open('.env', 'w') as f: f.write(content)
    print('  ALLOWED_HOSTS updated')
"

# Restart gunicorn to pick up new CORS
echo "==> Restarting Gunicorn..."
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user restart cleanrun-gunicorn

# Rebuild and redeploy frontend
echo "==> Building frontend..."
cd frontend
npm run build --silent

echo "==> Deploying to Vercel..."
npx vercel deploy --prod 2>&1 | grep -E "Aliased|Production|Error"

echo ""
echo "✅ Done! Frontend is live and pointing to $NGROK_URL"
echo "   Share this URL with your client: https://frontend-xenory.vercel.app"
