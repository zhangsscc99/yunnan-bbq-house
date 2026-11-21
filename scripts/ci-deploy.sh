#!/usr/bin/env bash
# Yunnan BBQ House deploy gate: build → backup → deploy → pm2 restart →
# health check → rollback on failure.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data

asset_of() { grep -o 'assets/index-[^"]*\.js' "$1" 2>/dev/null | head -1 || true; }

rollback() {
  latest=$(ls -1d server/dist.bak-* 2>/dev/null | sort | tail -1 || true)
  if [ -n "$latest" ]; then
    rm -rf server/dist && cp -a "$latest" server/dist
    pm2 restart yunnan-bbq --update-env >/dev/null 2>&1 || true
    echo "rolled back to $latest"
  fi
}

echo "[1/5] build client"
npm run build
ASSET=$(asset_of dist/index.html)
if [ -z "$ASSET" ]; then
  echo "BUILD ASSET MISSING"
  exit 1
fi
echo "built asset $ASSET"

echo "[2/5] backup current dist"
if [ -d server/dist ]; then
  cp -a server/dist "server/dist.bak-$(date +%s)"
  ls -1dt server/dist.bak-* 2>/dev/null | tail -n +4 | xargs -r rm -rf   # keep last 3
fi

echo "[3/5] deploy new dist"
rm -rf server/dist && cp -a dist server/dist
OTHER=$(asset_of server/dist/index.html)
if [ "$OTHER" != "$ASSET" ]; then
  echo "DEPLOY MISMATCH built=$ASSET served=$OTHER"
  rollback
  exit 1
fi

echo "[4/5] restart under pm2"
if pm2 describe yunnan-bbq >/dev/null 2>&1; then
  pm2 restart yunnan-bbq --update-env >/dev/null
else
  pm2 start ecosystem.config.cjs >/dev/null
fi
pm2 save >/dev/null 2>&1 || true

echo "[5/5] health check"
for i in $(seq 1 25); do
  if curl -sf http://127.0.0.1:3035/api/health >/dev/null; then
    LIVE=$(curl -sf http://127.0.0.1:3035/ || true)
    if grep -q "$ASSET" <<<"$LIVE"; then
      echo "DEPLOY OK"
      exit 0
    fi
    echo "DEPLOY MISMATCH built=$ASSET served=(not in live index.html)"
    break
  fi
  sleep 1
done

echo "DEPLOY FAILED"
rollback
exit 1
