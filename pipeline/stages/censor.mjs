// pipeline/stages/censor.mjs — v1.0 — 15JUL2026
//
// Stage 3: gate #1, the Nihil Obstat. Two halves, per doctrine:
//   deterministic — do the citation URLs actually resolve (an HTTP check is
//     code, not judgment; a dead link is a dead link no matter how it feels);
//   LLM — are the quotes real and the summary faithful (judgment, performed
//     by a different model family than the writer it checks).
// Failures feed the badger loop in run.mjs: fault named → targeted
// re-dispatch to the Astronomer → max 2 → spike or flag.

import { loadPrompt } from '../lib/prompts.mjs';
import { GATE_VERDICT } from '../lib/schemas.mjs';

/** Gate one bulletin. Returns {pass, faults[]} in GATE_VERDICT fault shape. */
export async function censorBulletin(ctx, bulletin) {
  const faults = [];

  // -- deterministic half: citations resolve ---------------------------------
  for (const c of bulletin.citations) {
    const ok = await ctx.checkUrl(c.url);
    if (!ok) {
      faults.push({
        description: `citation does not resolve: ${c.url}`,
        severity: 'hard',
        mustFix: true,
      });
    }
  }

  // -- LLM half: quote integrity + summary faithfulness ----------------------
  const { json } = await ctx.client.call({
    role: 'censor',
    model: ctx.casting.crew.censor.model,
    temperature: ctx.casting.crew.censor.temperature,
    system: loadPrompt('censor'),
    user: [
      `BULLETIN:\n${bulletin.body}`,
      `SOURCE MATERIAL:\n${JSON.stringify({
        title: bulletin.story.title,
        summary: bulletin.story.summary,
        url: bulletin.story.url,
        sources: bulletin.story.sources,
      }, null, 2)}`,
    ].join('\n\n'),
    schema: GATE_VERDICT,
  });
  faults.push(...json.faults);

  return { pass: faults.filter((f) => f.mustFix).length === 0 && json.pass, faults };
}
