/**
 * jsonld.js — Tentative d'extraction via données structurées JSON-LD.
 * Beaucoup de sites immo intègrent schema.org/RealEstateListing ou /Product
 * pour le SEO. Si présent, c'est gratuit, rapide et fiable : on l'essaie en premier.
 */

const cheerio = require('cheerio');

/**
 * Cherche et parse tous les blocs <script type="application/ld+json"> d'une page.
 * @param {string} html
 * @returns {object[]} Liste des objets JSON-LD trouvés (peut être vide)
 */
function extractJsonLdBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      // Certains sites mettent un tableau, d'autres un objet, d'autres un @graph
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else if (parsed['@graph']) {
        blocks.push(...parsed['@graph']);
      } else {
        blocks.push(parsed);
      }
    } catch {
      // JSON-LD malformé sur ce bloc → on l'ignore, pas bloquant
    }
  });

  return blocks;
}

/**
 * Types schema.org pertinents pour de l'immobilier.
 */
const RELEVANT_TYPES = [
  'RealEstateListing',
  'House',
  'SingleFamilyResidence',
  'Product',
  'Offer',
];

/**
 * Normalise un bloc JSON-LD en objet "annonce" standard.
 * Retourne null si le bloc ne contient pas assez d'infos exploitables.
 */
function normalizeListing(block) {
  if (!block || typeof block !== 'object') return null;

  const type = block['@type'];
  const typeStr = Array.isArray(type) ? type.join(',') : String(type || '');
  if (!RELEVANT_TYPES.some((t) => typeStr.includes(t))) return null;

  // Le prix peut être direct (price) ou niché dans offers
  const offer = block.offers || block;
  const price =
    offer.price ??
    offer.priceSpecification?.price ??
    block.price ??
    null;

  const address = block.address;
  const city =
    (typeof address === 'string' ? address : address?.addressLocality) || null;

  const listing = {
    title: block.name || null,
    price: price ? Number(String(price).replace(/[^\d.]/g, '')) : null,
    city,
    url: block.url || null,
    image: Array.isArray(block.image) ? block.image[0] : block.image || null,
    surface: block.floorSize?.value || null,
    source: 'jsonld',
  };

  // On exige au minimum un prix ou une surface pour considérer l'extraction utile
  if (!listing.price && !listing.surface) return null;

  return listing;
}

/**
 * Point d'entrée : tente d'extraire une ou plusieurs annonces via JSON-LD.
 * @param {string} html
 * @returns {object[]} Annonces normalisées trouvées (vide si aucune)
 */
function extractViaJsonLd(html) {
  const blocks = extractJsonLdBlocks(html);
  return blocks.map(normalizeListing).filter(Boolean);
}

module.exports = { extractViaJsonLd, extractJsonLdBlocks, normalizeListing };
