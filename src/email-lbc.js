/**
 * email-lbc.js — Récupère les alertes LeBonCoin reçues par mail (IMAP).
 * Contourne le blocage anti-bot de LBC en s'appuyant sur LEUR propre
 * système d'alerte natif : LBC t'envoie un mail, ce script le lit et
 * en extrait les annonces (titre, prix, ville, lien).
 *
 * Config requise (variables d'env / secrets GitHub) :
 * - LBC_EMAIL_HOST   (ex: imap.gmail.com)
 * - LBC_EMAIL_USER   (adresse dédiée aux alertes LBC)
 * - LBC_EMAIL_PASS   (mot de passe d'application, PAS le mot de passe du compte)
 * - LBC_EMAIL_SENDER (adresse expéditrice des alertes, ex: noreply@leboncoin.fr — à vérifier)
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');

const REQUIRED_ENV = ['LBC_EMAIL_HOST', 'LBC_EMAIL_USER', 'LBC_EMAIL_PASS'];

function isConfigured() {
  return REQUIRED_ENV.every((k) => !!process.env[k]);
}

/**
 * Extrait les annonces d'un email d'alerte LBC (HTML).
 * Cible les liens vers des pages d'annonce individuelles.
 */
function parseListingsFromEmailHtml(html) {
  const $ = cheerio.load(html);
  const listings = [];

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.includes('leboncoin.fr/ad/') && !href.includes('leboncoin.fr/vi/')) return;

    // Le texte du lien ou son contexte proche contient souvent titre/prix
    const blockText = $(el).closest('td, div, tr').text().replace(/\s+/g, ' ').trim();
    const priceMatch = blockText.match(/(\d[\d\s]{2,})\s?€/);

    listings.push({
      title: $(el).text().trim() || blockText.slice(0, 80) || null,
      price: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null,
      city: null, // pas toujours identifiable de façon fiable dans le snippet mail
      url: href.split('?')[0], // on retire les paramètres de tracking
      surface: null,
      land_surface: null,
      source: 'leboncoin-email',
      site: 'leboncoin',
    });
  });

  // Dédoublonne par URL (un même mail peut lister le lien plusieurs fois : image + titre)
  const seen = new Set();
  return listings.filter((l) => {
    if (!l.url || seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

/**
 * Se connecte à la boîte mail, lit les mails non lus de l'expéditeur LBC,
 * en extrait les annonces, et marque les mails comme lus.
 * @returns {Promise<object[]>} liste des annonces trouvées
 */
async function fetchLbcAlerts() {
  if (!isConfigured()) {
    console.log('leboncoin-email: variables d\'env absentes, étape ignorée');
    return [];
  }

  const client = new ImapFlow({
    host: process.env.LBC_EMAIL_HOST,
    port: 993,
    secure: true,
    auth: {
      user: process.env.LBC_EMAIL_USER,
      pass: process.env.LBC_EMAIL_PASS,
    },
    logger: false,
  });

  const allListings = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const searchCriteria = { seen: false };
      if (process.env.LBC_EMAIL_SENDER) {
        searchCriteria.from = process.env.LBC_EMAIL_SENDER;
      }

      const uids = await client.search(searchCriteria);
      console.log(`leboncoin-email: ${uids.length} mail(s) non lu(s) trouvé(s)`);

      for (const uid of uids) {
        const { content } = await client.download(uid);
        const parsed = await simpleParser(content);
        const html = parsed.html || parsed.textAsHtml;
        if (!html) continue;

        const listings = parseListingsFromEmailHtml(html);
        allListings.push(...listings);

        // Marque comme lu pour ne pas le retraiter au prochain run
        await client.messageFlagsAdd(uid, ['\\Seen']);
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.warn(`leboncoin-email: erreur de connexion/lecture: ${err.message}`);
    // Ne bloque pas le run global : LBC est une source secondaire
    return [];
  }

  console.log(`leboncoin-email: ${allListings.length} annonce(s) extraite(s)`);
  return allListings;
}

module.exports = { fetchLbcAlerts, parseListingsFromEmailHtml, isConfigured };
