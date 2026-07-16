// pipeline/stages/fabulist.mjs — v1.0 — 15JUL2026
//
// Stage 4: the Fabulist — the fiction firewall's translator. Factual
// bulletins go in; cosmic dispatch comes out, dressed entirely in Dictionary
// archetypes. The Dictionary's translation table rides into the prompt
// VERBATIM at runtime (loaded from canon/, never copied into code) — the
// left column is the Fabulist's secret, and the Inquisitor downstream
// checks that it stayed one.

import { loadPrompt } from '../lib/prompts.mjs';

/** Translate the day's bulletins into one cosmic dispatch (prose body). */
export async function draftDispatch(ctx, bulletins, faultNote = null) {
  const material = bulletins.map((b, i) => ({
    item: i + 1,
    storyId: b.storyId,
    headline: b.title,
    bulletin: b.body,
  }));
  const user = [
    `TODAY'S BULLETINS (translate each into a dispatch item; the water-world's sorrows arrive last, as the closing kicker):\n${JSON.stringify(material, null, 2)}`,
    faultNote ? `FAULT NOTE FROM THE EDITOR (previous translation rejected):\n${faultNote}` : null,
  ].filter(Boolean).join('\n\n');

  const { text } = await ctx.client.call({
    role: 'fabulist',
    model: ctx.casting.crew.fabulist.model,
    temperature: ctx.casting.crew.fabulist.temperature,
    system: loadPrompt('fabulist'), // {{CANON_BIBLE}} + {{DICTIONARY}} injected at load
    user,
  });
  return text.trim();
}

export async function runFabulist(ctx, { bulletins }) {
  const body = await draftDispatch(ctx, bulletins);
  return {
    dispatch: {
      // Deterministic title: the Editor sets the type, the Fabulist writes the prose.
      title: `Dispatch of ${ctx.date}: News from the Sees`,
      body,
      storyIds: bulletins.map((b) => b.storyId),
    },
  };
}
