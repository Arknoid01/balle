#!/usr/bin/env bash
# Installe un timer systemd utilisateur (Arch Linux) — run quotidien à 7h.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
RUN_AT="${1:-07:00}"

mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/scraper-immo.service" <<EOF
[Unit]
Description=Scraper immo Valserhône (run quotidien)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$REPO
EnvironmentFile=-$REPO/.env
ExecStart=$REPO/scripts/local-run.sh
EOF

cat > "$UNIT_DIR/scraper-immo.timer" <<EOF
[Unit]
Description=Timer scraper immo — tous les jours à $RUN_AT

[Timer]
OnCalendar=*-*-* $RUN_AT:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

chmod +x "$REPO/scripts/local-run.sh" "$REPO/scripts/push-results.sh"

systemctl --user daemon-reload
systemctl --user enable --now scraper-immo.timer

echo ""
echo "Timer installé. Prochain run :"
systemctl --user list-timers scraper-immo.timer --no-pager
echo ""
echo "Test manuel : systemctl --user start scraper-immo.service"
echo "Logs       : journalctl --user -u scraper-immo.service -n 50"
