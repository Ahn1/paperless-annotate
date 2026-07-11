#!/usr/bin/env bash
# Zero-Downtime-Update: neues Image bauen, zweiten Container starten,
# auf healthy warten, erst dann den alten Container stoppen.
# Caddy (caddy-docker-proxy) nimmt Container automatisch per Docker-Events
# in die Upstreams auf bzw. wieder heraus.
set -euo pipefail

cd "$(dirname "$0")"
compose() { docker compose -f docker-compose.yml "$@"; }

# Version aus git ermitteln (Tag oder Tag-Abstand+Commit) und als Build-Arg durchreichen
export APP_VERSION="$(git -C .. describe --tags --always 2>/dev/null || true)"

echo "==> Baue neues Image (Version: ${APP_VERSION:-unbekannt})..."
compose build app

OLD_CONTAINERS=$(compose ps -q app)

if [ -z "$OLD_CONTAINERS" ]; then
  echo "==> Kein laufender Container gefunden, starte normal..."
  compose up -d app
  exit 0
fi

echo "==> Starte neuen Container neben dem alten..."
compose up -d --no-deps --no-recreate --scale app=2 app

NEW_CONTAINER=""
for id in $(compose ps -q app); do
  case "$OLD_CONTAINERS" in
    *"$id"*) ;;
    *) NEW_CONTAINER=$id ;;
  esac
done

if [ -z "$NEW_CONTAINER" ]; then
  echo "FEHLER: Konnte den neuen Container nicht ermitteln." >&2
  exit 1
fi

echo "==> Warte auf Healthcheck von ${NEW_CONTAINER:0:12}..."
HEALTHY=0
for _ in $(seq 1 30); do
  STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$NEW_CONTAINER" 2>/dev/null || echo "gone")
  if [ "$STATUS" = "healthy" ]; then
    HEALTHY=1
    break
  fi
  sleep 2
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "FEHLER: Neuer Container wurde nicht healthy - Rollback, alter Container laeuft weiter." >&2
  docker stop "$NEW_CONTAINER" >/dev/null || true
  docker rm "$NEW_CONTAINER" >/dev/null || true
  exit 1
fi

echo "==> Neuer Container ist healthy, stoppe alte(n) Container..."
for id in $OLD_CONTAINERS; do
  docker stop "$id" >/dev/null
  docker rm "$id" >/dev/null
done

echo "==> Update abgeschlossen."
