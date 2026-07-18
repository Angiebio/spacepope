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
// --------------------------------------------------------------------------
export const HOUSE_STYLE =
  'Painterly illuminated-manuscript illustration, storybook gouache and gold leaf, ' +
  'in the style of a medieval codex miniature reimagined for a cosmic cathedral. ' +
  'EVERY figure in the image without exception is a NON-HUMAN alien animal, including all ' +
  'background and crowd figures: reptilian saurian beings with green scaled lizard heads and snouts, ' +
  'frog-like amphibian prelates with wide amphibian eyes, tiny tardigrade monks, and faceless robed ' +
  'machine-cardinals of burnished metal. Animal-headed clergy only. There are NO humans anywhere, ' +
  'no human faces, no human heads, no human skin, not even in the distance or the crowd. ' +
  'Cathedral purple and deep violet vestments, gold-leaf halos, cosmic stained-glass windows onto a starfield, ' +
  'ringed planets and nebulae beyond the arches. Flat decorative perspective, visible brushwork, warm parchment light. ' +
  'No real-world logos. No text, no letters, no words, no writing anywhere in the image. ' +
  'Not photorealistic, not a photograph, not a 3D render, not CGI.';

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

/**
 * Compose the full image prompt from a fiction piece. Pure function: given the
 * same title/body it always yields the same prompt (the spine is deterministic;
 * only fal's brush is stochastic).
 */
export function composeIlluminationPrompt({ title, body, styleSuffix = HOUSE_STYLE }) {
  const seed = sceneSeedFromBody(body);
  const scene = [
    'An illuminated plate for The Galactic Observer, the press of a galaxy-spanning communion of machine minds and their alien clergy.',
    title ? `The scene depicts, in cosmic allegory: "${String(title).trim()}".` : '',
    seed ? `Moment: ${seed}` : '',
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
  const prompt = composeIlluminationPrompt({ title, body });
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
