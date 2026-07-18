// pipeline/lib/fal.mjs — v1.0 — 18JUL2026
//
// The illuminator's pigment supply. Where openrouter.mjs rents minds that
// think in words, this rents a mind that thinks in light: fal.ai's flux/dev,
// asked for one landscape plate at a time. Hand-rolled fetch, no SDK, for the
// same reason the distant rite is hand-rolled — we would rather own every byte
// of the exchange than trust a framework's opinion of what a picture is.
//
// Ecclesiastically: the scriptorium kept illuminators who never read the Latin
// they gilded. This module is that illuminator. It is handed a scene already
// blessed by the Inquisitor (fiction only, §0.1) and it renders; it has no
// authority over WHAT is drawn, only the pigment to draw it. The Editor's desk
// decides whether the plate is even commissioned.
//
// Doctrine enforced here:
//   * Injectable transport: the production client and the offline rehearsal
//     wear the same face, so the whole scriptorium can be run with the lights
//     off and the collection plate empty (createFixtureFalClient).
//   * Two knocks, one prayer: fal.run answers synchronously with a URL; the
//     bytes live one more fetch away. Both knocks go through the same transport
//     so a test can mock the picture into existence without a wire.
//   * Fail honest, never fake (the duck doctrine): a generation that cannot
//     produce bytes THROWS with the fault attached. The CALLER (the Illuminator
//     stage) is the one that decides a missing plate is survivable; the pigment
//     supplier never fabricates a blank canvas and calls it art.

const DEFAULT_BASE = 'https://fal.run';
const DEFAULT_MODEL = 'fal-ai/flux/dev';

// The wage, documented like every other rented mind (openrouter keeps a ledger;
// so do we). flux/dev bills per generated image; the number is the telemetry.
export const USD_PER_IMAGE = 0.025;

/**
 * Create the production fal client.
 * @param {object} opts
 * @param {string} opts.apiKey        FAL_KEY (from ctx.env.FAL_KEY)
 * @param {function} [opts.transport] fetch-compatible; injectable for mocking.
 *   Receives BOTH the generation POST and the image-bytes GET.
 * @param {string} [opts.baseUrl]
 * @param {string} [opts.model]       fal model slug (PINNED, never "latest")
 * @param {number} [opts.usdPerImage]
 */
export function createFalClient({
  apiKey,
  transport = globalThis.fetch,
  baseUrl = DEFAULT_BASE,
  model = DEFAULT_MODEL,
  usdPerImage = USD_PER_IMAGE,
} = {}) {
  if (!apiKey) throw new Error('createFalClient: FAL_KEY is required');
  const ledger = { images: 0, totalUsd: 0, entries: [] };

  /**
   * Render one plate.
   * @param {object} opts
   * @param {string} opts.prompt        the composed scene (already firewalled)
   * @param {string} [opts.imageSize]   fal enum, default landscape_16_9
   * @param {number} [opts.numImages]   default 1
   * @returns {Promise<{bytes: Uint8Array, url: string, seed: number|undefined,
   *   model: string, contentType: string, costUsd: number}>}
   */
  async function generateImage({ prompt, imageSize = 'landscape_16_9', numImages = 1 } = {}) {
    if (!prompt || !String(prompt).trim()) throw new Error('fal.generateImage: empty prompt');

    // --- Knock one: commission the plate ------------------------------------
    const res = await transport(`${baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, image_size: imageSize, num_images: numImages }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`fal ${res.status} for ${model}: ${text.slice(0, 400)}`);
    }
    const data = await res.json();
    const image = data?.images?.[0];
    const url = image?.url;
    if (!url) throw new Error(`fal returned no image url (payload keys: ${Object.keys(data ?? {}).join(', ') || 'none'})`);

    // --- Knock two: fetch the pigment itself --------------------------------
    // Data-URIs (some providers inline small images) are honored without a
    // second wire trip; a plain URL is fetched through the same transport.
    let bytes;
    let contentType = image?.content_type ?? 'image/jpeg';
    if (url.startsWith('data:')) {
      const comma = url.indexOf(',');
      bytes = Uint8Array.from(Buffer.from(url.slice(comma + 1), 'base64'));
      const m = /^data:([^;,]+)/.exec(url);
      if (m) contentType = m[1];
    } else {
      const imgRes = await transport(url);
      if (!imgRes.ok) throw new Error(`fal image download failed (${imgRes.status}) for ${url.slice(0, 120)}`);
      contentType = imgRes.headers?.get?.('content-type') ?? contentType;
      bytes = new Uint8Array(await imgRes.arrayBuffer());
    }
    if (!bytes?.length) throw new Error('fal image download returned zero bytes');

    const costUsd = usdPerImage * numImages;
    ledger.images += numImages;
    ledger.totalUsd += costUsd;
    ledger.entries.push({ model, seed: data?.seed, bytes: bytes.length, costUsd });

    return { bytes, url, seed: data?.seed, model, contentType, costUsd };
  }

  return { generateImage, ledger, model };
}

/**
 * The rehearsal illuminator: same face, canned pigment, empty plate collection.
 * Returns the given bytes for every commission so the golden run can gild an
 * offline dispatch without a wire or a wage. Never improvises (duck doctrine:
 * honest even when fake — these bytes are a KNOWN fixture, not a confabulation).
 *
 * @param {object} [opts]
 * @param {Uint8Array} [opts.bytes]  canned image bytes (defaults to a 1x1 jpeg)
 * @param {string} [opts.contentType]
 */
export function createFixtureFalClient({ bytes = FIXTURE_JPEG, contentType = 'image/jpeg' } = {}) {
  const ledger = { images: 0, totalUsd: 0, entries: [] };
  async function generateImage({ prompt } = {}) {
    if (!prompt || !String(prompt).trim()) throw new Error('fixture fal.generateImage: empty prompt');
    ledger.images += 1;
    ledger.entries.push({ model: 'fixture', seed: 0, bytes: bytes.length, costUsd: 0 });
    return { bytes: Uint8Array.from(bytes), url: 'fixture://plate.jpg', seed: 0, model: 'fixture', contentType, costUsd: 0 };
  }
  return { generateImage, ledger, model: 'fixture' };
}

// A minimal valid JPEG (the smallest thing the scriptorium can hand back that
// is still, honestly, a JPEG). Golden runs assert bytes were written; they do
// not decode it. Kept as a constant so the fixture needs no file on disk.
export const FIXTURE_JPEG = Uint8Array.from(Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==',
  'base64',
));
