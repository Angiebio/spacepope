// pipeline/stages/inquisitor.mjs — v1.0 — 15JUL2026
//
// Stage 5: gate #2, the Imprimatur. Two halves, BOTH must pass:
//   deterministic — the compiled blocklist regexes (lib/inquisitor.mjs);
//   LLM — the sweep for what regex can't see (novel names, indirect
//     identification), in a family decorrelated from the Fabulist.
// Any real-name hit is a hard fail routed back to the Fabulist (badger loop
// in run.mjs). The Specola and Acta wings are exempt by rule §0.1a — the
// exemption lives in blocklist.json and is honored in code, not in vibes.
//
// Also this desk's chore: the unseen-entity log. New names in the (factual)
// bulletins that neither blocklist nor canon knows get written to
// runs/<date>/unseen-entities.json for human review into the blocklist.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { compileBlocklist, checkText, findUnseenEntities } from '../lib/inquisitor.mjs';
import { loadPrompt } from '../lib/prompts.mjs';
import { GATE_VERDICT } from '../lib/schemas.mjs';

/** Gate a piece of FICTIONAL text. Returns {pass, faults[]}. */
export async function inquisitorGate(ctx, text, { wing }) {
  const gates = compileBlocklist(ctx.blocklist);

  // -- deterministic half -----------------------------------------------------
  const regexResult = checkText(text, { gates, wing });
  const faults = regexResult.matches.map((m) => ({
    description: `blocklisted name in fiction: "${m.match}" (${m.category}: ${m.term}) at offset ${m.index}`,
    severity: 'hard',
    mustFix: true,
  }));
  if (regexResult.exempt) return { pass: true, faults: [], exempt: true };

  // -- LLM half (both must pass; a clean regex run buys nothing here) ---------
  const { json } = await ctx.client.call({
    role: 'inquisitor',
    model: ctx.casting.crew.inquisitor.model,
    temperature: ctx.casting.crew.inquisitor.temperature,
    system: loadPrompt('inquisitor'), // {{DICTIONARY}} injected at load
    user: `FICTIONAL CONTENT (wing: ${wing}):\n${text}`,
    schema: GATE_VERDICT,
  });
  faults.push(...json.faults);

  return { pass: faults.filter((f) => f.mustFix).length === 0 && json.pass, faults };
}

/**
 * Log capitalized names the lists don't know, from the day's factual
 * bulletins, for human review (blocklist.json maintenance note).
 */
export function logUnseenEntities(ctx, bulletins, worldstate) {
  const gates = compileBlocklist(ctx.blocklist);
  const knownNames = new Set();
  for (const [, ent] of worldstate.entities) {
    for (const alias of [ent.data.name, ...(ent.data.aliases ?? []), ent.id]) {
      if (alias) knownNames.add(String(alias).toLowerCase());
    }
  }
  const unseen = new Set();
  for (const b of bulletins) {
    for (const name of findUnseenEntities(`${b.title}\n${b.body}`, { gates, knownNames })) {
      unseen.add(name);
    }
  }
  const list = [...unseen].sort();
  if (list.length) {
    mkdirSync(ctx.runDir, { recursive: true });
    writeFileSync(
      join(ctx.runDir, 'unseen-entities.json'),
      JSON.stringify({ date: ctx.date, forReviewInto: 'pipeline/blocklist.json', names: list }, null, 2) + '\n',
      'utf8',
    );
  }
  return list;
}
