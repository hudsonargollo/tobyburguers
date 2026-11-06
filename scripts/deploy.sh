#!/usr/bin/env bash
# Build the store and deploy the standalone output to /var/www/tobyburguers.
# Production data in <deploy>/uploads is never touched.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/tobyburguers}"
SERVICE="${SERVICE:-tobyburguers.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3016/}"

cd "$ROOT"

echo "==> Installing dependencies"
npm install --prefer-offline --no-audit --no-fund

echo "==> Generating Prisma client"
npx prisma generate

echo "==> Applying database migrations"
npx prisma migrate deploy

echo "==> Building"
npm run build

echo "==> Syncing build to $DEPLOY_DIR"
# Stage the build outside the project first: when building in place, rsync
# would otherwise copy a tree into a destination that contains its source and
# delete the static assets it is reading.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -a "$ROOT/.next/standalone/." "$STAGE/"
mkdir -p "$STAGE/.next/static"
cp -a "$ROOT/.next/static/." "$STAGE/.next/static/"
# node_modules is intentionally NOT synced: the standalone tree only carries the
# server-side subset, and copying it over the full install breaks later builds
# (client-only files such as react-dom/client.js go missing).
mkdir -p "$DEPLOY_DIR/.next"
rsync -a --delete "$STAGE/.next/" "$DEPLOY_DIR/.next/"
rsync -a "$STAGE/server.js" "$STAGE/package.json" "$DEPLOY_DIR/"
if [ "$ROOT" != "$DEPLOY_DIR" ]; then
  rsync -a --delete "$ROOT/public/" "$DEPLOY_DIR/public/"
fi

echo "==> Clearing runtime cache"
rm -rf "$DEPLOY_DIR/.next/cache"

echo "==> Restarting $SERVICE"
systemctl restart "$SERVICE"

echo "==> Health check"
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)"
  if [ "$code" = "200" ]; then
    echo "OK: $HEALTH_URL returned 200"
    exit 0
  fi
  sleep 1
done

echo "FAILED: $HEALTH_URL did not return 200" >&2
journalctl -u "$SERVICE" -n 40 --no-pager >&2 || true
exit 1
