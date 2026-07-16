// pipeline/stages/archivist.mjs — v1.0 — 15JUL2026
//
// Stage: the Archivist. The Chronicler testified (STATE_UPDATE, at write
// time); this desk files the testimony: deterministic diff-merge into
// world/canon/, chapter digest onto the ladder, and — every tenth chapter —
// the arc and saga regenerated FROM the layer below, never from older
// summaries. The Archivist's only LLM is the Summarizer, and even that is
// injected as a function so the filing itself stays pure code.
//
// NOTE ON RUN ORDER (contract resolution, logged for the Editor): ROADMAP-02
// §1 lists Archivist at step 7, before the Chronicler — but the STATE_UPDATE
// it merges is EMITTED by the Chronicler, and ROADMAP-03 §2 (the engine spec)
// orders WRITE → BADGER → MERGE → SUMMARIZE. The engine spec wins: state
// capture at write time is the load-bearing pattern. So this stage runs
// after the chapter passes its continuity badger.

import { loadPrompt } from '../lib/prompts.mjs';
import { mergeStateUpdate, writeChapterDigest, maybeRegenerateSummaries } from '../lib/worldstate.mjs';

export async function runArchivist(ctx, { update }) {
  const notes = [];

  // -- deterministic diff-merge ------------------------------------------------
  const merge = mergeStateUpdate(ctx.worldDir, update, { recordedAt: `${ctx.date}T00:00:00.000Z` });
  notes.push(...merge.notes);

  // -- the digest, written in the same breath as the chapter -------------------
  if (update.chapterDigest) {
    writeChapterDigest(ctx.worldDir, update.chapter, update.chapterDigest);
  } else {
    notes.push('chronicler omitted chapterDigest — ladder rung missing for this chapter');
  }

  // -- the ladder: arc every 10 chapters, saga from arcs -----------------------
  const summarize = async (instruction, corpus) => {
    const { text } = await ctx.client.call({
      role: 'summarizer',
      model: ctx.casting.crew.summarizer.model,
      temperature: ctx.casting.crew.summarizer.temperature,
      system: loadPrompt('summarizer'),
      user: `${instruction}\n\n====\n\n${corpus}`,
    });
    return text;
  };
  const ladder = await maybeRegenerateSummaries(ctx.worldDir, update.chapter, summarize);
  if (ladder.arcRegenerated) notes.push(`arc summary regenerated: ${ladder.arcRegenerated}`);
  if (ladder.sagaRegenerated) notes.push('saga regenerated from arc summaries');

  return { merge, ladder, notes };
}
