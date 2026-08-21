#!/usr/bin/env bash
# Lance le scraper depuis ton PC (toutes les sources actives, pas de skip CI).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

# Pas de mode CI → PAP, SeLoger, Logic-Immo sont tentés
unset CI GITHUB_ACTIONS

if [[ -f "$REPO/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO/.env"
  set +a
fi

echo "[$(date -Iseconds)] Run scraper immo — $REPO"
npm start

if [[ "${PUSH_RESULTS:-0}" == "1" ]]; then
  "$REPO/scripts/push-results.sh"
fi

echo "[$(date -Iseconds)] Terminé."
