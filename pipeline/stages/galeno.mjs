// pipeline/stages/galeno.mjs — v1.0 — 18JUL2026
//
// Stage 6, the body-beat's answer to the College: the Archiater's Rounds.
// Where the sky-beat seats a whole College and lets them BID for the floor
// (college.mjs, arithmetic adjudication), the Lazaretto has exactly one
// physician — Cardinal Galeno — and he always writes his own ward-notes. So
// there is no bidding here, no fairness weight, no win history: a single
// cardinal, magnificently certain, taking the day's translated medical
// dispatch and rounding on the patient (the water-world).
//
// The firewall is identical to the sky-beat's: Galeno reads text the Fabulist
// and Inquisitor ALREADY blessed (cosmic archetypes, no real names), then his
// own Rounds go back through the same Inquisitor gate on the same badger loop.
// A physician who leaks a real name loses his floor exactly like a Cardinal
// would. Fiction is fiction on either beat (Hard Rule §0.1).

import { loadPrompt } from '../lib/prompts.mjs';
import { badgerLoop } from './badger.mjs';
import { inquisitorGate } from './inquisitor.mjs';

/** Draft the Rounds once (used fresh and on badger redispatch). */
export async function draftRounds(ctx, dispatch, faultNote = null) {
  const galeno = ctx.casting.lazaretto.galeno;
  const user = [
    `TODAY'S TRANSLATED DISPATCH FROM THE WATER-WORLD'S CLINICS (already in the communion's archetypes; the patient is the water-world):\n${dispatch.title}\n\n${dispatch.body}`,
    'Round on the patient. Write your ward-notes.',
    faultNote ? `FAULT NOTE FROM THE EDITOR (previous Rounds rejected):\n${faultNote}` : null,
  ].filter(Boolean).join('\n\n');

  const { text } = await ctx.client.call({
    role: 'galeno-rounds',
    model: galeno.model,
    temperature: galeno.temperature,
    system: loadPrompt('galeno-rounds', {
      GALENO_NAME: galeno.name,
      GALENO_TITLE: galeno.title,
      SEE: galeno.see,
      VOICE: galeno.voice,
    }),
    user,
  });
  return text.trim();
}

/**
 * The Archiater's Rounds stage: Galeno writes, the Inquisitor gates, the badger
 * arbitrates (max 2 redispatches, then spike or flag — the duck doctrine, same
 * as the Fabulist's dispatch). Returns a shape the Editor can press or spike.
 *
 * @returns {{rounds: {title, body, storyIds}|null, cardinal, model,
 *   status: 'pass'|'flagged'|'spiked', faults, retries, notes}}
 */
export async function runGaleno(ctx, { dispatch }) {
  const galeno = ctx.casting.lazaretto.galeno;
  const draft = await draftRounds(ctx, dispatch);
  const result = await badgerLoop(ctx, {
    vocation: 'reality', // the "did the firewall hold" vocation, same as the dispatch's
    artifactLabel: "the Archiater's Rounds",
    artifact: { body: draft },
    render: (d) => d.body,
    judge: (d) => inquisitorGate(ctx, d.body, { wing: 'rounds' }),
    redispatch: async (d, faults) => ({
      ...d,
      body: await draftRounds(ctx, dispatch, faults.map((f) => f.description).join('\n')),
    }),
  });

  return {
    rounds: result.status === 'spiked' ? null : {
      // Deterministic title: the Editor sets the type, Galeno writes the prose.
      title: `The Archiater's Rounds, ${ctx.date}`,
      body: result.artifact.body,
      storyIds: dispatch.storyIds,
    },
    cardinal: 'galeno',
    model: galeno.model,
    status: result.status,
    faults: result.faults,
    retries: result.retries,
    notes: result.notes,
  };
}
