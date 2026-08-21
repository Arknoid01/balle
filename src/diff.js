/**
 * diff.js — Compare les annonces extraites à ce qui a déjà été vu (data/seen.json)
 * et retourne uniquement les nouvelles.
 */

const fs = require('fs');
const path = require('path');

const SEEN_PATH = path.join(__dirname, '..', 'data', 'seen.json');

function loadSeen() {
  try {
    const raw = fs.readFileSync(SEEN_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {}; // premier run : rien de vu encore
  }
}

function saveSeen(seenMap) {
  fs.mkdirSync(path.dirname(SEEN_PATH), { recursive: true });
  fs.writeFileSync(SEEN_PATH, JSON.stringify(seenMap, null, 2), 'utf-8');
}

/**
 * Clé unique pour une annonce (basée sur son URL, plus fiable qu'un id interne au site).
 */
function listingKey(listing) {
  return listing.url || `${listing.title}-${listing.price}-${listing.city}`;
}

/**
 * Compare une liste d'annonces extraites au set déjà connu.
 * @param {object[]} listings
 * @returns {{ newListings: object[], updatedSeen: object }}
 */
function diffListings(listings) {
  const seen = loadSeen();
  const newListings = [];
  const now = new Date().toISOString();

  for (const listing of listings) {
    const key = listingKey(listing);
    if (!seen[key]) {
      seen[key] = { ...listing, first_seen: now };
      newListings.push(listing);
    }
  }

  return { newListings, updatedSeen: seen };
}

module.exports = { diffListings, saveSeen, loadSeen };
