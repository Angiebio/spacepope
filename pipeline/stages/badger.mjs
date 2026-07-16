// pipeline/stages/badger.mjs — v1.0 — 15JUL2026
//
// The Space Reality Badger: one mechanism, two vocations (reality and
// continuity). The Badger names the fault, names the stage that owes the fix,
// and routes — it never rewrites anything itself; the Editor does the routing
// and the original desk does the rewriting. Max 2 redispatches, then the duck
// doctrine takes the wheel: spike with a logged reason, or publish with a
// visible flag. There is no third option, because the third option is lying.
//
// Ecclesiastically: every court needs one incorruptible auditor from a
// different bloodline than the accused. Ours is a badger. It is very good
// at its job and completely indifferent to your feelings about deadlines.

import { loadPrompt } from '../lib/prompts.mjs';
import { BADGER_RULING } from '../lib/schemas.mjs';

/** One ruling from the Badger. Vocation: 'reality' | 'continuity'. */
export async function badgerRuling(ctx, { vocation, artifactLabel, artifact, context, faults = [] }) {
  const { json, costUsd } = await ctx.client.call({
    role: 'badger',
    model: ctx.casting.crew.badger.model,
    temperature: ctx.casting.crew.badger.temperature,
    system: loadPrompt('badger'),
    user: [
      `VOCATION: ${vocation}`,
      `ARTIFACT (${artifactLabel}):\n${artifact}`,
      context ? `SUPPORTING CONTEXT:\n${context}` : null,
      faults.length ? `FAULTS ALREADY NAMED BY THE GATE:\n${JSON.stringify(faults, null, 2)}` : null,
    ].filter(Boolean).join('\n\n'),
    schema: BADGER_RULING,
  });
  return { ruling: json, costUsd };
}

/**
 * The badger loop (ROADMAP-02 §1 steps 3b/5b/9): gate → on failure, Badger
 * arbitrates → targeted re-dispatch → max 2 → spike or flag.
 *
 * @param {object} ctx        pipeline context
 * @param {object} opts
 * @param {string} opts.vocation       'reality' | 'continuity'
 * @param {string} opts.artifactLabel  e.g. 'specola bulletin', 'observer dispatch'
 * @param {string|object} opts.artifact  initial artifact
 * @param {function} opts.render       artifact → string for the Badger's eyes
 * @param {function} opts.judge        async artifact → {pass, faults[]}  (the gate)
 * @param {function} opts.redispatch   async (artifact, faults) → new artifact (the original desk, with a fault note)
 * @param {string} [opts.context]      supporting context for the Badger
 * @param {number} [opts.maxRedispatch=2]
 * @returns {{status: 'pass'|'flagged'|'spiked', artifact, faults, retries, notes}}
 */
export async function badgerLoop(ctx, { vocation, artifactLabel, artifact, render = String, judge, redispatch, context = '', maxRedispatch = 2 }) {
  let retries = 0;
  const notes = [];
  let lastFaults = [];

  for (;;) {
    const verdict = await judge(artifact);
    if (verdict.pass) {
      return { status: 'pass', artifact, faults: [], retries, notes };
    }
    lastFaults = verdict.faults ?? [];

    // The gate said no; the Badger arbitrates what "no" means today.
    const { ruling } = await badgerRuling(ctx, {
      vocation,
      artifactLabel,
      artifact: render(artifact),
      context,
      faults: lastFaults,
    });
    notes.push(`badger verdict: ${ruling.verdict} (${ruling.faults.length} fault(s))`);

    if (ruling.verdict === 'pass') {
      // The Badger overrules a fussy gate on the record — logged, not silent.
      notes.push('badger overruled gate faults as non-blocking');
      return { status: 'pass', artifact, faults: ruling.faults, retries, notes };
    }
    if (ruling.verdict === 'spike') {
      return { status: 'spiked', artifact, faults: ruling.faults, retries, notes };
    }
    if (ruling.verdict === 'flag') {
      return { status: 'flagged', artifact, faults: ruling.faults, retries, notes };
    }

    // redispatch — but the budget is finite, and when it runs out we do not
    // pretend: mustFix outstanding → spike; cosmetic only → flag. (The duck
    // was fed to the engine so that you would not have to learn this later.)
    if (retries >= maxRedispatch) {
      const mustFix = ruling.faults.some((f) => f.mustFix);
      notes.push(`redispatch budget exhausted after ${retries} retries`);
      return { status: mustFix ? 'spiked' : 'flagged', artifact, faults: ruling.faults, retries, notes };
    }
    retries++;
    artifact = await redispatch(artifact, ruling.faults);
  }
}

/** Render a fault list as a one-line honest flag for the colophon. */
export function faultFlag(faults) {
  if (!faults?.length) return undefined;
  return `published with named fault(s): ${faults.map((f) => f.description).join(' | ')}`.slice(0, 500);
}
