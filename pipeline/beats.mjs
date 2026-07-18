// pipeline/beats.mjs — v1.0 — 18JUL2026
//
// THE BEAT REGISTRY. A "beat" is a whole news vocation the same deterministic
// spine can be pointed at: the sky-beat (the Specola, AI news) or the body-beat
// (the Lazaretto, medtech news). Canon §5b makes the quarantine doctrine — the
// two orders "share no ledger, no telescope, and no table" — and this file is
// where that doctrine becomes config the Editor's desk obeys. One registry,
// read once at WAKE; every place that USED to hardcode "specola"/"observer"/
// "sources.json" now asks the beat instead.
//
// Ecclesiastically: the same courier, the same gates, the same presses — but a
// different cordon walked, a different memory kept, a different cardinal at the
// end of the corridor. Nothing crosses the cordon because the cordon is a value
// in a table, not a hope in a comment.
//
// The AI beat is the DEFAULT and its shape is exactly the pre-beat behavior:
// runId with no suffix, the Specola/Observer/Chronicle it always was. A beat is
// added by adding a row here, not by editing the orchestrator.

/**
 * @typedef {object} Beat
 * @property {string} id                 the flag value (`--beat=<id>`)
 * @property {string} sourcesFile        pipeline/<file> — the Nuncio's routes
 * @property {string} suggestionsFile    pipeline/<file> — the Showrunner's box (may be absent)
 * @property {string} factualCollection  content/<dir> — the telescope wing (real names, §0.1a)
 * @property {string} satireCollection   content/<dir> — the fiction wing (firewalled)
 * @property {'college'|'galeno'} satireOwner  who writes the satire commentary
 * @property {boolean} makesChronicle    does this beat feed the novel?
 * @property {string} dispatchWing       fiction-firewall wing label for the dispatch/satire
 * @property {string} runIdSuffix        keeps the two beats' Acta + runs/ from colliding
 * @property {string} fixtureNews        tests/golden/fixtures/<file> — canned courier bag
 * @property {string} fixtureLlm         tests/golden/fixtures/<file> — canned minds
 */

/** @type {Record<string, Beat>} */
export const BEATS = {
  // ---- the sky-beat: AI news. The default; the pre-beat behavior, unchanged. -
  ai: {
    id: 'ai',
    sourcesFile: 'sources.json',
    suggestionsFile: 'suggestions.json',
    factualCollection: 'specola',
    satireCollection: 'observer',
    satireOwner: 'college',      // the whole College bids; the winner writes commentary
    makesChronicle: true,        // the Observer dispatch feeds the Chronicle novel
    dispatchWing: 'observer',    // a checked (non-exempt) wing — the firewall applies
    runIdSuffix: '',             // the default beat owns the bare date, so nothing regresses
    fixtureNews: 'news.json',
    fixtureLlm: 'llm-responses.json',
  },

  // ---- the body-beat: medtech/biotech news. The Lazaretto (canon §5b). -------
  // One physician, not a bidding College (Galeno always writes his own Rounds);
  // no Chronicle (the novel belongs to the sky-beat); its own sources, its own
  // covered-ledger, its own Acta. Quarantined by rite, quarantined by config.
  medtech: {
    id: 'medtech',
    sourcesFile: 'sources.medtech.json',
    suggestionsFile: 'suggestions.medtech.json', // absent today → an empty box, honestly
    factualCollection: 'lazaretto',
    satireCollection: 'rounds',
    satireOwner: 'galeno',       // the Archiater, sole voice of the ward
    makesChronicle: false,       // the body-beat is Bulletins + Rounds only
    dispatchWing: 'rounds',      // also a checked wing — the firewall holds identically
    runIdSuffix: '-medtech',     // Acta 2026-07-18-medtech never overwrites 2026-07-18
    fixtureNews: 'news.medtech.json',
    fixtureLlm: 'llm-responses.medtech.json',
  },
};

/** The default beat when no `--beat` flag is given: the sky-beat. */
export const DEFAULT_BEAT = 'ai';

/**
 * Resolve a beat id to its config. Unknown beats fail loudly (duck doctrine:
 * a typo'd beat is not a silent fallback to the AI beat, it is an error).
 * @param {string|null|undefined} id
 * @returns {Beat}
 */
export function resolveBeat(id) {
  const key = id ?? DEFAULT_BEAT;
  const beat = BEATS[key];
  if (!beat) {
    throw new Error(`unknown --beat "${key}" (known beats: ${Object.keys(BEATS).join(', ')})`);
  }
  return beat;
}
