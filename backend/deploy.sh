#!/usr/bin/env bash
set -euo pipefail

# Deploy script for backend using pm2
# - Builds TypeScript
# - Applies Prisma migrations
# - Restarts pm2 process
#
# Requirements:
# - ENV vars set (DATABASE_URL, NODE_ENV, PM2_APP_NAME)
# - pm2 installed on the host
# - prisma CLI available (npm in this project)

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PM2_APP_NAME="${PM2_APP_NAME:-maplibre-backend}"

cd "$APP_DIR"

echo "[deploy] Installing deps"
npm install --silent

echo "[deploy] Building backend"
npm run build

echo "[deploy] Applying Prisma migrations"
npx prisma migrate deploy

# Optional: seed data (uncomment if needed)
# echo "[deploy] Seeding database"
# npm run ts-node ./src/scripts/seed.ts

# Restart or start pm2 app
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "[deploy] Restarting pm2 app: $PM2_APP_NAME"
  pm2 restart "$PM2_APP_NAME"
else
  echo "[deploy] Starting pm2 app: $PM2_APP_NAME"
  pm2 start dist/src/server.js --name "$PM2_APP_NAME"
fi

echo "[deploy] Done."