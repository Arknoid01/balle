/**
 * fetch.js — Récupération du HTML d'une page d'annonce ou de résultats.
 * - User-Agent réaliste (évite le blocage basique)
 * - Timeout pour ne pas bloquer le run GitHub Actions
 * - Délai random optionnel avant la requête (à appeler entre chaque fetch dans main.js)
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Attend un délai aléatoire entre minSeconds et maxSeconds.
 * À appeler AVANT chaque fetch pour lisser le pattern de requêtes.
 */
function randomDelay(minSeconds = 2, maxSeconds = 5) {
  const ms = (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Récupère le HTML brut d'une URL.
 * @param {string} url
 * @param {object} options
 * @param {number} options.timeoutMs - timeout en ms (défaut 15s)
 * @returns {Promise<{ok: boolean, status: number, html: string|null, error: string|null}>}
 */
async function fetchHtml(url, { timeoutMs = 15000 } = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'fr-FR,fr;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });

    if (!res.ok) {
      return { ok: false, status: res.status, html: null, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    return { ok: true, status: res.status, html, error: null };
  } catch (err) {
    return { ok: false, status: 0, html: null, error: err.message };
  }
}

module.exports = { fetchHtml, randomDelay, USER_AGENT };
