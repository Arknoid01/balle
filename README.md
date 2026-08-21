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
