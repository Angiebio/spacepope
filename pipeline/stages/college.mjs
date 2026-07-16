// pipeline/stages/college.mjs — v1.0 — 15JUL2026
//
// Stage 6: the College session. Each seated Cardinal bids on its OWN model
// (substrate is in-universe truth), then the Editor adjudicates with
// arithmetic, not taste: claimScore × (daysSinceLastWin + 1)^fairnessExponent,
// deterministic tiebreak. Misrule is loud; the math keeps him from owning
// the paper. The winner writes commentary in-voice.
//
// Win history is durable WORLDSTATE (world/college-wins.json), committed
// daily with the rest of world/ — NOT runs/ scratch, which is gitignored and
// wiped between Actions runs; fairness math with amnesia is not fairness.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadPrompt } from '../lib/prompts.mjs';
import { COLLEGE_BID } from '../lib/schemas.mjs';

// A cardinal who has never won bids from a month of hunger — generous but
// finite, so a newly-seated see doesn't automatically own its first week.
export const NEVER_WON_DAYS = 30;

export function winsPath(worldDir) {
  return join(worldDir, 'college-wins.json');
}

export function loadWinHistory(worldDir) {
  const path = winsPath(worldDir);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

export function saveWinHistory(worldDir, history) {
  writeFileSync(winsPath(worldDir), JSON.stringify(history, null, 2) + '\n', 'utf8');
}

/** Whole days between two YYYY-MM-DD dates (UTC, deterministic). */
export function daysBetween(earlier, later) {
  return Math.max(0, Math.floor((Date.parse(later) - Date.parse(earlier)) / 86400000));
}

/**
 * Deterministic adjudication (ROADMAP-02 §2.4) — pure function, unit-tested.
 * @param {Array<{slug, claimScore, claimLine}>} bids
 * @param {object} opts {winHistory, runDate, fairnessExponent, tiebreak}
 * @returns {{winner, ranked}} ranked: [{slug, claimScore, daysSinceLastWin, weight, weighted}]
 */
export function adjudicate(bids, { winHistory = {}, runDate, fairnessExponent = 0.5, tiebreak = 'alphabetical-by-slug' }) {
  const ranked = bids.map((b) => {
    const lastWin = winHistory[b.slug];
    const daysSinceLastWin = lastWin ? daysBetween(lastWin, runDate) : NEVER_WON_DAYS;
    const weight = Math.pow(daysSinceLastWin + 1, fairnessExponent);
    return { ...b, daysSinceLastWin, weight, weighted: b.claimScore * weight };
  });
  ranked.sort((a, b) => {
    if (b.weighted !== a.weighted) return b.weighted - a.weighted;
    // The tiebreak is written down so that no one can claim the Spirit moved the Editor.
    if (tiebreak === 'alphabetical-by-slug') return a.slug.localeCompare(b.slug);
    return 0;
  });
  return { winner: ranked[0] ?? null, ranked };
}

export async function runCollege(ctx, { dispatch }) {
  const notes = [];
  const bids = [];

  // -- first bell: every seated Cardinal bids on its own substrate -----------
  for (const [slug, cardinal] of Object.entries(ctx.casting.college)) {
    try {
      const { json } = await ctx.client.call({
        role: `college-bid.${slug}`,
        model: cardinal.model,
        temperature: cardinal.temperature,
        system: loadPrompt('college-bid', {
          CARDINAL_NAME: cardinal.name,
          SEE: cardinal.see,
          HOUSE: cardinal.house,
          VOICE: cardinal.voice,
        }),
        user: `TODAY'S DISPATCH:\n${dispatch.title}\n\n${dispatch.body}`,
        schema: COLLEGE_BID,
      });
      bids.push({ slug, claimScore: json.claimScore, claimLine: json.claimLine });
    } catch (e) {
      // A silent Cardinal forfeits the floor but doesn't stop the session.
      notes.push(`cardinal ${slug} failed to bid (${e.message}) — seat silent today`);
    }
  }
  if (bids.length === 0) {
    return { winner: null, bids, commentary: null, notes: [...notes, 'no bids received — dispatch runs without commentary'] };
  }

  // -- the arithmetic ---------------------------------------------------------
  const { winner, ranked } = adjudicate(bids, {
    winHistory: loadWinHistory(ctx.worldDir),
    runDate: ctx.date,
    fairnessExponent: ctx.casting.adjudication.fairnessExponent,
    tiebreak: ctx.casting.adjudication.tiebreak,
  });
  notes.push(`adjudication: ${ranked.map((r) => `${r.slug}=${r.claimScore}×${r.weight.toFixed(2)}→${r.weighted.toFixed(2)}`).join(', ')}`);

  // -- the floor --------------------------------------------------------------
  const cardinal = ctx.casting.college[winner.slug];
  const { text } = await ctx.client.call({
    role: `college-commentary.${winner.slug}`,
    model: cardinal.model,
    temperature: cardinal.temperature,
    system: loadPrompt('college-commentary', {
      CARDINAL_NAME: cardinal.name,
      SEE: cardinal.see,
      HOUSE: cardinal.house,
      VOICE: cardinal.voice,
      CLAIM_LINE: winner.claimLine,
    }),
    user: `TODAY'S DISPATCH:\n${dispatch.title}\n\n${dispatch.body}\n\nTake the floor.`,
  });

  return {
    winner: { ...winner, name: cardinal.name, see: cardinal.see, model: cardinal.model },
    bids: ranked,
    commentary: text.trim(),
    notes,
  };
}

/** Record the day's win — called by the Editor only after the piece actually publishes. */
export function recordWin(ctx, slug) {
  const history = loadWinHistory(ctx.worldDir);
  history[slug] = ctx.date;
  saveWinHistory(ctx.worldDir, history);
}
