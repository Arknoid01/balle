/**
 * llm.js — Fallback d'extraction via LLM quand le JSON-LD est absent/insuffisant.
 * Rotation Groq → OpenRouter, avec retry + backoff. Si les deux providers
 * échouent, on lève une erreur qui stoppe tout le run (comportement voulu).
 */

const PROVIDERS = [
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  },
  {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct',
  },
];

const EXTRACTION_SCHEMA_PROMPT = `Tu extrais des données structurées d'une annonce immobilière à partir d'un texte brut.
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, au format exact suivant :
{
  "title": string ou null,
  "price": number ou null (en euros, sans symbole),
  "city": string ou null,
  "surface": number ou null (surface habitable en m²),
  "land_surface": number ou null (surface du terrain en m²),
  "rooms": number ou null,
  "description_summary": string ou null (résumé en une phrase)
}
Si une info est absente du texte, mets null. Ne devine jamais une valeur qui n'est pas dans le texte.`;

/**
 * Appelle un provider LLM avec le texte nettoyé d'une annonce.
 * @param {string} cleanedText
 * @param {number} maxRetriesPerProvider
 * @returns {Promise<object>} objet annonce extrait
 */
async function extractWithFallback(cleanedText, maxRetriesPerProvider = 2) {
  const prompt = `${EXTRACTION_SCHEMA_PROMPT}\n\nTexte de l'annonce :\n"""\n${cleanedText}\n"""`;

  for (const provider of PROVIDERS) {
    const apiKey = provider.key?.trim();
    if (!apiKey) {
      console.warn(`${provider.name}: clé API absente, provider ignoré`);
      continue;
    }

    for (let attempt = 1; attempt <= maxRetriesPerProvider; attempt++) {
      try {
        if (attempt === 1) {
          console.log(`${provider.name}: modèle ${provider.model}`);
        }
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.status === 401) {
          const hint =
            provider.name === 'groq'
              ? 'regénère-la sur console.groq.com'
              : 'regénère-la sur openrouter.ai';
          console.warn(`${provider.name}: clé API invalide (401) — ${hint}, puis mets à jour le secret GitHub`);
          break;
        }
        if (res.status === 404) {
          console.warn(
            `${provider.name}: modèle introuvable (404) — ${provider.model} (change GROQ_MODEL / OPENROUTER_MODEL si besoin)`
          );
          break;
        }
        if (res.status === 429 || res.status === 503) {
          console.warn(`${provider.name}: quota/limite atteint (${res.status}), switch provider`);
          break;
        }
        if (!res.ok) {
          const detail = (await res.text()).slice(0, 200);
          throw new Error(`${provider.name} HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error(`${provider.name}: réponse vide`);

        const parsed = JSON.parse(content);
        return { ...parsed, source: `llm:${provider.name}` };
      } catch (err) {
        console.warn(
          `${provider.name} tentative ${attempt}/${maxRetriesPerProvider} échouée: ${err.message}`
        );
        if (attempt < maxRetriesPerProvider) {
          await new Promise((r) => setTimeout(r, 1000 * attempt)); // backoff léger
        }
      }
    }
  }

  // Les deux providers ont échoué → on stoppe tout le run (comportement voulu)
  throw new Error('Tous les providers LLM ont échoué — arrêt du run');
}

module.exports = { extractWithFallback };
