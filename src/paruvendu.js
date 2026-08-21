/**
 * paruvendu.js — Extraction des annonces depuis une page de résultats ParuVendu.
 * Le HTML contient les cartes d'annonces (pas besoin de JS ni de LLM).
 */

const cheerio = require('cheerio');

const BASE_URL = 'https://www.paruvendu.fr';

function parsePrice(text) {
  const afterPhotos = text.match(/photos\s+\d+\s+(\d{1,3}(?: \d{3})+)\s*€/i);
  if (afterPhotos) return Number(afterPhotos[1].replace(/\s/g, ''));

  const beforeMaison = [...text.matchAll(/(\d{1,3}(?: \d{3})+)\s*€\s*Maison/gi)]
    .map((m) => Number(m[1].replace(/\s/g, '')))
    .filter((p) => p >= 50_000 && p <= 2_000_000);
  if (beforeMaison.length) return beforeMaison[beforeMaison.length - 1];

  const candidates = [...text.matchAll(/(\d{1,3}(?: \d{3})+)\s*€/g)]
    .map((m) => Number(m[1].replace(/\s/g, '')))
    .filter((p) => p >= 50_000 && p <= 2_000_000);
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function parseCardText(text) {
  const price = parsePrice(text);
  const surfaceMatch = text.match(/Maison\s+([\d.,]+)\s*m\s*2/i);
  const landMatch = text.match(/Terrain\s+([\d\s]+)\s*m\s*2/i);
  const roomsMatch = text.match(/(\d+)\s*pièces/i);
  const cityMatch = text.match(/Valserh[ôo]ne|Bellegarde[^,(]*/i);

  const titleStart = text.match(
    /(?:DPE[^.]+\.\s*)?(Vente[^.]{10,120}|Valserh[^.]{10,120}|Bellegarde[^.]{10,120}|Maison[^.]{10,120})/i
  );

  return {
    title: titleStart ? titleStart[1].trim() : null,
    price,
    city: cityMatch ? cityMatch[0].trim() : 'Valserhône',
    surface: surfaceMatch ? Number(surfaceMatch[1].replace(/\s/g, '').replace(',', '.')) : null,
    land_surface: landMatch ? Number(landMatch[1].replace(/\s/g, '')) : null,
    rooms: roomsMatch ? Number(roomsMatch[1]) : null,
  };
}

/**
 * @param {string} html
 * @returns {object[]}
 */
function extractFromSearchHtml(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  $('[class*="blocAnnonce"]').each((_, el) => {
    const $card = $(el);
    const href = $card.find('a[href*="A1KIVHMN"]').first().attr('href');
    if (!href) return;

    const path = href.startsWith('http') ? new URL(href).pathname : href;
    if (seen.has(path)) return;
    seen.add(path);

    const $clone = $card.clone();
    $clone.find('script, style, noscript').remove();
    const text = $clone.text().replace(/\s+/g, ' ').trim();
    const parsed = parseCardText(text);
    if (!parsed.price) return;

    listings.push({
      ...parsed,
      url: href.startsWith('http') ? href.split('?')[0] : `${BASE_URL}${path}`,
      source: 'paruvendu-html',
    });
  });

  return listings;
}

module.exports = { extractFromSearchHtml, parseCardText, parsePrice };
