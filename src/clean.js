/**
 * clean.js — Nettoyage du HTML avant envoi au LLM (fallback si JSON-LD absent).
 * Objectif : réduire le nombre de tokens et garder uniquement le contenu utile
 * (retire scripts, styles, nav, footer, pubs...).
 */

const cheerio = require('cheerio');

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'nav',
  'footer',
  'header',
  'iframe',
  '[class*="cookie"]',
  '[class*="banner"]',
  '[class*="advert"]',
  '[id*="cookie"]',
];

/**
 * Nettoie le HTML et retourne un texte condensé, prêt à être envoyé au LLM.
 * @param {string} html
 * @param {number} maxChars - limite de taille pour contrôler le coût tokens (défaut 8000)
 * @returns {string}
 */
function cleanHtml(html, maxChars = 8000) {
  const $ = cheerio.load(html);

  NOISE_SELECTORS.forEach((sel) => $(sel).remove());

  // On essaie de cibler la zone principale de l'annonce si elle est identifiable,
  // sinon on prend le body entier nettoyé.
  const mainCandidates = [
    'main',
    '[class*="listing"]',
    '[class*="annonce"]',
    '[class*="property"]',
    '[id*="listing"]',
    'article',
  ];

  let $target = null;
  for (const sel of mainCandidates) {
    const found = $(sel);
    if (found.length && found.text().trim().length > 200) {
      $target = found.first();
      break;
    }
  }

  const text = ($target || $('body')).text();

  // Compacte les espaces/retours à la ligne multiples
  const compact = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

  return compact.length > maxChars ? compact.slice(0, maxChars) : compact;
}

module.exports = { cleanHtml };
