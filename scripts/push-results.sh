#!/usr/bin/env bash
# Pousse les résultats sur GitHub (pour le dashboard Pages).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

git add data/seen.json data/last-run-summary.json docs/results.json

if git diff --staged --quiet; then
  echo "Aucun changement à pousser."
  exit 0
fi

git commit -m "chore: update scrape results [local run $(date +%Y-%m-%d)]"
git push origin HEAD

echo "Résultats poussés sur GitHub."
