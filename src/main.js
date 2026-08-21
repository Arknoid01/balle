/**
 * main.js — Orchestrateur du run quotidien.
 * Flux : fetch → JSON-LD (prioritaire) → fallback LLM → diff → maj data/results → notif
 */

const fs = require('fs');
const path = require('path');

const { fetchHtml, randomDelay } = require('./fetch');
const { extractViaJsonLd } = require('./jsonld');
const { cleanHtml } = require('./clean');
const { extractWithFallback } = require('./llm');
const { diffListings, saveSeen } = require('./diff');
const { fetchLbcAlerts } = require('./email-lbc');
const { extractFromSearchHtml } = require('./paruvendu');

const SITES_PATH = path.join(__dirname, '..', 'sites', 'sites.json');
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'search-config.json');
const RESULTS_PATH = path.join(__dirname, '..', 'docs', 'results.json');
const SUMMARY_PATH = path.join(__dirname, '..', 'data', 'last-run-summary.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * Extrait une ou plusieurs annonces d'une page HTML :
 * essaie JSON-LD d'abord, sinon fallback LLM sur le texte nettoyé.
 */
async function extractListingsFromHtml(html, sourceId) {
  if (sourceId === 'paruvendu') {
    const viaParuvendu = extractFromSearchHtml(html);
    if (viaParuvendu.length > 0) {
      console.log(`[${sourceId}] extraction HTML (${viaParuvendu.length} annonce(s))`);
      return viaParuvendu;
    }
  }

  const viaJsonLd = extractViaJsonLd(html);
  if (viaJsonLd.length > 0) {
    console.log(`[${sourceId}] extraction via JSON-LD (${viaJsonLd.length} annonce(s))`);
    return viaJsonLd;
  }

  console.log(`[${sourceId}] pas de JSON-LD exploitable, fallback LLM`);
  const cleaned = cleanHtml(html);
  const extracted = await extractWithFallback(cleaned);
  return [{ ...extracted, source: extracted.source || 'llm' }];
}

async function run() {
  const config = loadJson(CONFIG_PATH);
  const { sites } = loadJson(SITES_PATH);
  const isCi = process.env.CI === 'true';
  const activeSites = sites.filter((s) => {
    if (!s.active || !s.search_url_template) return false;
    if (isCi && s.skip_in_ci) return false;
    return true;
  });

  const skippedInCi = isCi ? sites.filter((s) => s.active && s.skip_in_ci) : [];
  if (skippedInCi.length) {
    console.log(
      `Mode CI — site(s) ignoré(s) (anti-bot sur IP datacenter): ${skippedInCi.map((s) => s.id).join(', ')}`
    );
  }

  console.log(`Run démarré — ${activeSites.length} site(s) actif(s), config:`, config);

  const allListings = [];
  const runErrors = [];

  for (const site of activeSites) {
    await randomDelay(2, 5); // lisse le pattern de requêtes entre chaque site

    const result = await fetchHtml(site.search_url_template);
    if (!result.ok) {
      const msg = `[${site.id}] fetch échoué: ${result.error}`;
      console.error(msg);
      runErrors.push(msg);
      continue;
    }

    try {
      const listings = await extractListingsFromHtml(result.html, site.id);
      allListings.push(...listings.map((l) => ({ ...l, site: site.id })));
    } catch (err) {
      const msg = `[${site.id}] extraction impossible: ${err.message}`;
      console.error(msg);
      runErrors.push(msg);
    }
  }

  // Source secondaire : alertes LeBonCoin reçues par mail (contourne l'anti-bot).
  // Échec silencieux si non configuré ou en erreur — ne bloque jamais le run.
  const lbcListings = await fetchLbcAlerts();
  allListings.push(...lbcListings);

  // Filtre selon les critères de config (budget, terrain min)
  const filtered = allListings.filter((l) => {
    if (config.budget_max && l.price && l.price > config.budget_max) return false;
    if (config.land_min_m2 && l.land_surface && l.land_surface < config.land_min_m2) return false;
    return true;
  });

  const { newListings, updatedSeen } = diffListings(filtered);
  saveSeen(updatedSeen);

  fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(Object.values(updatedSeen), null, 2), 'utf-8');

  fs.mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
  fs.writeFileSync(
    SUMMARY_PATH,
    JSON.stringify(
      {
        run_at: new Date().toISOString(),
        new_count: newListings.length,
        newListings,
        errors: runErrors,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`Run terminé — ${newListings.length} nouvelle(s) annonce(s), ${runErrors.length} erreur(s).`);
  if (runErrors.length > 0) {
    console.warn('Détail des erreurs:', runErrors.join(' | '));
  }
}

run().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
