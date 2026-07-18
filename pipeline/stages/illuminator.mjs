// pipeline/stages/illuminator.mjs — v1.0 — 18JUL2026
//
// Stage (optional, post-firewall): the Illuminator — the scriptorium's gilder.
// It illustrates the FICTION wings only: an Observer dispatch or a Chronicle
// chapter, never the Specola. Putting a generated picture on real news is
// exactly the sin this whole publication satirizes, so the telescope wing stays
// text and citations, forever (EDITORIAL LAW §1).
//
// Deterministic spine, no new mind (Hard Rule §2): the scene prompt is a pure
// function of text that ALREADY PASSED THE INQUISITOR — the piece's title and
// its opening lines. We do not commission a fresh LLM call to describe the
// scene, because that call would be an un-firewalled mouth speaking into the
// image, and the image has no Inquisitor of its own. Derive only from blessed
// fiction; append a fixed house style that forces the clergy alien and the
// frame unmistakably illustrated, so no plate could pass for a photograph of
// real people.
//
// Fail honest, never fake (the duck doctrine): if there is no fal client (no
// FAL_KEY) or the pigment supplier throws, the Illuminator logs the reason and
// returns { illustration: null }. The piece MUST still publish. Art never
// blocks the presses — the same covenant the Tavily fallback keeps for news.

import { writeIllustration } from '../lib/press.mjs';

// --------------------------------------------------------------------------
// THE HOUSE STYLE — the coda welded onto every scene prompt.
// This is the load-bearing string: it is what keeps the clergy non-human and
// the plate non-photographic. Tuned against real generations (see
// tests/illustration/reports/). Change it and you change every future plate,
// so change it deliberately, and re-tune.
// v2 (18JUL2026, Showrunner): shifted from painterly gouache to hand-drawn
// marker-and-ink comic linework.
// v3 (18JUL2026, Jim's style notes via the Showrunner): refined to detailed
// Ligne Claire graphic-novel art — clean uniform precise outlines, cell shading
// with controlled gradients, deep focus, localized purple/blue cold-light glows,
// dense architectural detail. Premium clean-lined panel; still emphatically an
// illustration, never a photograph, so the no-humans law holds. Jim's blurb
// adapted; only the subject and the alien-clergy mandate are ours.
// --------------------------------------------------------------------------
// v4 (18JUL2026, Showrunner): DECOUPLED the clergy description from the always-on
// style and moved it into the per-shot subjects. When the style itself no longer
// insists on "clergy," a still-life or empty-landscape shot summons no crowd, and
// flux stops filling the frame with borderline-human rows. The style now carries
// only render technique, palette, and the no-humans law; the SHOTS carry the subject.
export const HOUSE_STYLE =
  'Detailed Ligne Claire graphic novel art style. Clean, uniform, precise ink outlines. Cell shading with ' +
  'controlled gradients and a crisp, clean color palette. Intricate, dense detail, deep focus, clear even lighting, ' +
  'with specific localized purple and blue cold-light glows on halos, key objects, and interfaces. ' +
  'Palette of cathedral purple and violet, gold leaf, and cosmic starfields with ringed planets and nebulae. ' +
  'IMPORTANT: any character that appears is a NON-HUMAN alien only (a scaled green reptilian being, a wide-eyed ' +
  'amphibian, a tiny tardigrade, or a faceless burnished machine). There are NO humans anywhere, no human faces, ' +
  'no human heads, no human skin, not even small or in the distance. ' +
  'No real-world logos. No text, no letters, no words, no writing anywhere. ' +
  'Premium clean-lined sci-fi graphic novel panel with high depth. Not photorealistic, not a photograph, ' +
  'not a 3D render, no motion blur.';

// The negative guidance flux honors as a soft steer. Kept beside the positive
// coda so the two are edited together.
export const NEGATIVE_STYLE =
  'photograph, photorealistic, 3d render, human face, human person, real people, ' +
  'the Vatican, Pope Francis, real pope, text, watermark, signature, caption, letters';

/**
 * Pull a short, clean scene seed from already-firewalled fiction prose.
 * Strips markdown furniture, refuses anything past a commentary break or a
 * horizontal rule (the appended Cardinal commentary is a separate voice), and
 * trims to two sentences or ~320 chars at a word boundary.
 */
export function sceneSeedFromBody(body = '', maxLen = 320) {
  let text = String(body)
    .split(/\n\s*(?:---|## Commentary)/)[0]  // stop before appended commentary
    .replace(/```[\s\S]*?```/g, ' ')          // no fenced blocks (state_update)
    .replace(/^#{1,6}\s+/gm, '')              // strip heading marks
    .replace(/[*_>#`]/g, ' ')                 // strip inline markdown furniture
    .replace(/\s+/g, ' ')
    .trim();
  // Prefer the first two sentences; fall back to a hard word-boundary cut.
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length) {
    let acc = '';
    for (const s of sentences) {
      if ((acc + s).length > maxLen) break;
      acc += s;
    }
    text = (acc || sentences[0]).trim();
  }
  if (text.length > maxLen) {
    const cut = text.slice(0, maxLen);
    text = `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }
  return text;
}

// The shot rotation. flux, left alone, renders every cathedral as a symmetric
// nave lined with identical prelates ("eerie rows of alien popes"). We refuse
// that by handing each plate an explicit, DIFFERENT camera on the deterministic
// spine: a shot is chosen by a stable hash of the piece's key, so the same
// chapter always gets the same shot, but consecutive pieces vary. None of these
// is a symmetric group portrait.
// Deliberately CROWD-AVERSE: nearly every shot has one subject or none. flux
// fills any crowd with borderline-human faces and lines them into symmetric
// rows, so the surest cure for both the "eerie rows of alien popes" rut AND the
// stray-human leak is to compose scenes that structurally hold no crowd. Where
// a figure appears it is one clear, close, unmistakably-alien subject.
export const SHOTS = [
  'A tight close-up portrait of exactly ONE alien cardinal, a single scaled green reptilian face or wide-eyed amphibian face filling the frame in three-quarter view. No other figures anywhere.',
  'A still life with NO figures of any kind: a single sacred object (an open ledger, a brass orrery, a jeweled reliquary, a great telescope, a guttering candle) resting on a stone altar, close and richly detailed. No people.',
  'A single small robed alien figure seen only FROM BEHIND at a tall arched window, gazing out at ringed planets and a bright nebula. Only this one figure, its face never shown, the rest of the room empty.',
  'An empty establishing landscape with NO figures at all: an orbital cathedral adrift above an alien world beneath a strange sky, architecture and cosmos only.',
  'Exactly ONE alien machine-cardinal of burnished metal bent alone over a great brass telescope in an empty observatory, side view, no one else present.',
  'Exactly ONE towering alien pontiff, a great scaled reptilian being in cathedral purple, in a dramatic low-angle hero shot, entirely alone with empty space around, cold light from one side.',
  'At most TWO alien clergy, scaled reptilian or amphibian, in quiet conversation, medium close and off-center, with an empty simple background behind them.',
  'An empty cosmic cathedral interior with NO figures: soaring arches, a great rose window onto a starfield, cold coloured light across bare stone. Architecture and cosmos only, no people.',
];

/** Deterministic shot pick: same key → same shot, neighbors differ. */
export function pickShot(key) {
  let h = 0;
  for (const c of String(key || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SHOTS[h % SHOTS.length];
}

/**
 * Compose the full image prompt from a fiction piece. Pure function: given the
 * same key/title/body it always yields the same prompt (the spine is
 * deterministic; only fal's brush is stochastic).
 */
export function composeIlluminationPrompt({ key, title, body, styleSuffix = HOUSE_STYLE }) {
  const seed = sceneSeedFromBody(body);
  const scene = [
    'A single illuminated scene for The Galactic Observer, the press of a galaxy-spanning communion of alien clergy and machine minds.',
    title ? `Titled "${String(title).trim()}".` : '',
    // Lead with the SPECIFIC moment from the firewalled text, so each plate
    // illustrates its own story rather than defaulting to a group portrait.
    seed ? `Depict this specific moment as one cinematic illustration: ${seed}` : '',
    // The assigned camera for this piece (deterministic variety).
    pickShot(key ?? title ?? body),
    'Do NOT arrange symmetrical rows of identical figures. Do NOT make a wide symmetric cathedral nave lined with prelates. ' +
      'Do NOT make a formal front-facing group portrait. Favor one clear focal subject and an off-center, dynamic composition.',
    styleSuffix,
  ].filter(Boolean).join(' ');
  return scene;
}

/** Honest alt text: names the piece, the style, and that a machine drew it. */
export function illuminationAlt(title, wing) {
  const kind = wing === 'chronicle' ? 'chapter of the Chronicle' : 'Observer dispatch';
  return `Illuminated plate for the ${kind} "${String(title).trim()}": a stylized, non-photographic scene of the communion's alien clergy. Machine-generated illustration.`;
}

/**
 * Illuminate one fiction piece. Writes the plate into ctx.assetsDir and returns
 * the frontmatter filename + alt, or nulls (with a logged note) on any failure.
 *
 * @param {object} ctx  the run context (needs falClient, assetsDir)
 * @param {object} piece
 * @param {string} piece.slug   basename for the plate (matches the content slug)
 * @param {string} piece.title
 * @param {string} piece.body   the firewalled prose (dispatch body / chapter prose)
 * @param {'observer'|'chronicle'} piece.wing
 * @returns {Promise<{illustration: string|null, illustrationAlt: string|null,
 *   model: string|null, costUsd: number, notes: string[]}>}
 */
export async function runIlluminator(ctx, { slug, title, body, wing }) {
  // No pigment supplier commissioned this run — skip, honestly.
  if (!ctx.falClient) {
    return { illustration: null, illustrationAlt: null, model: null, costUsd: 0,
      notes: [`skipped: no FAL_KEY — "${title}" publishes without a plate`] };
  }
  const prompt = composeIlluminationPrompt({ key: slug, title, body });
  try {
    const { bytes, contentType, model, costUsd, seed } = await ctx.falClient.generateImage({ prompt });
    const filename = writeIllustration(ctx.assetsDir, { slug, bytes, contentType });
    return {
      illustration: filename,
      illustrationAlt: illuminationAlt(title, wing),
      model,
      costUsd,
      notes: [`illuminated ${filename} (${model}${seed !== undefined ? `, seed ${seed}` : ''}, $${round6(costUsd)})`],
    };
  } catch (err) {
    // Duck doctrine at the caller's grace: name the fault, keep the presses warm.
    return { illustration: null, illustrationAlt: null, model: null, costUsd: 0,
      notes: [`illumination failed for "${title}": ${String(err.message).slice(0, 300)} — publishing without a plate`] };
  }
}

function round6(x) {
  return Math.round((x ?? 0) * 1e6) / 1e6;
}
