# Scraper immo — Valserhône

Scraper immobilier personnel pour repérer des maisons autour de **Valserhône** (rayon 30 km, budget max 280 000 €, terrain min 1 000 m²).

## Fonctionnement

1. Récupération des pages de résultats (PAP, SeLoger, Logic-Immo, ParuVendu…)
2. Extraction prioritaire via **JSON-LD** (schema.org)
3. Fallback **LLM** (Groq → OpenRouter) si le JSON-LD est absent
4. Alertes **LeBonCoin par email IMAP** (contourne l'anti-bot)
5. Filtrage budget / terrain, dédoublonnage, export des résultats

## Structure

```
config/search-config.json   # critères de recherche
sites/sites.json            # portails immo et URLs
src/                        # code du scraper
data/seen.json              # annonces déjà vues
docs/                       # dashboard + results.json (GitHub Pages)
```

## Installation locale

```bash
npm install
cp .env.example .env
# Renseigner au minimum GROQ_API_KEY ou OPENROUTER_API_KEY
npm start
```

Les résultats sont écrits dans `docs/results.json` et `data/last-run-summary.json`.

## Automatisation sur Arch Linux (PC toujours allumé)

Recommandé si tu veux PAP / SeLoger / Logic-Immo : ton IP box passe mieux que GitHub Actions.

```bash
git clone https://github.com/Arknoid01/balle.git
cd balle
npm install
cp .env.example .env
# Éditer .env : GROQ_API_KEY=gsk_...
# Optionnel : PUSH_RESULTS=1 pour mettre à jour le dashboard GitHub Pages

chmod +x scripts/*.sh
./scripts/install-systemd-user.sh        # run tous les jours à 7h
# ou heure custom :
./scripts/install-systemd-user.sh 08:30
```

Commandes utiles :

```bash
systemctl --user start scraper-immo.service   # lancer maintenant
journalctl --user -u scraper-immo.service -f  # voir les logs
systemctl --user list-timers                  # prochain run
```

Pour que le timer tourne même sans session ouverte :

```bash
sudo loginctl enable-linger "$USER"
```

### Git push depuis ton PC

Si `PUSH_RESULTS=1`, le script pousse `data/` et `docs/results.json` sur GitHub après chaque run.
Configure l’accès git une fois (SSH ou token) :

```bash
git remote -v   # doit pointer vers ton fork / Arknoid01/balle
ssh -T git@github.com
```

Tu peux **désactiver le cron GitHub Actions** (Settings → Actions → Disable workflow, ou supprimer la ligne `schedule:` dans `daily-scrape.yml`) pour éviter les doublons.

## GitHub Actions

Le workflow `daily-scrape.yml` lance un run chaque jour à 6 h UTC (7 h Paris en hiver). Il peut aussi être déclenché manuellement depuis l'onglet Actions ou le dashboard.

### Secrets à configurer

| Secret | Obligatoire | Description |
|--------|-------------|-------------|
| `GROQ_API_KEY` | au moins une clé LLM | Extraction fallback via Groq |
| `OPENROUTER_API_KEY` | au moins une clé LLM | Fallback si Groq échoue |
| `LBC_EMAIL_*` | non | Lecture des alertes LeBonCoin par IMAP |

Le dashboard (`docs/index.html`) permet de gérer critères, secrets et runs via l'API GitHub (token `repo` requis).

## GitHub Pages

Activer Pages sur la branche `main`, dossier `/docs`. Le dashboard et `results.json` seront servis à l'URL Pages du dépôt.

## Critères par défaut

Voir `config/search-config.json` :

- Centre : Valserhône, France
- Rayon : 30 km
- Budget max : 280 000 €
- Terrain min : 1 000 m²
