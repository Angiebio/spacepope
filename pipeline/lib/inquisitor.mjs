// pipeline/lib/inquisitor.mjs — v1.0 — 15JUL2026
//
// The Inquisitor's deterministic half: the blocklist made teeth. Hard Rule
// §0.1 — no real people in fiction, ever — is too important to trust to a
// model's mood, so the first gate is pure regex: case-insensitive, whole-word,
// tolerant of possessives and plurals. The LLM half (a different family than
// the Fabulist it checks) hunts what regex can't — novel names, indirect
// identification — and BOTH must pass. Blocklist is data, not vibes.
//
// Ecclesiastically: the fiction firewall between the Specola (which reports
// the water-world factually, real names required) and every other publication
// (where real names are excommunicate on sight). §0.1a wing exemptions are
// honored here, at the gate, in code.
//
// Also kept here: the unseen-entity logger. When a new foundry-baron enters
// the news cycle, his name appears in bulletins before anyone thought to
// blocklist him — so we log capitalized names the lists don't know to
// runs/<date>/unseen-entities.json for human review into blocklist.json.

/**
 * Compile blocklist.json into executable gates.
 * Whole-word, case-insensitive, possessive/plural tolerant:
 *   Altman, Altman's, Altmans, Altmans', ALTMAN, Altman-esque (boundary at -)
 * Multi-word terms tolerate any whitespace/hyphens between words.
 */
export function compileBlocklist(blocklist) {
  const compiled = [];
  for (const [category, terms] of Object.entries(blocklist.categories)) {
    if (!Array.isArray(terms)) continue; // `exemptions` is an object, not a term list
    for (const term of terms) {
      compiled.push({ term, category, regex: termRegex(term) });
    }
  }
  // Per blocklist notes.gpt: bare "GPT" matches as whole word ("the Numbered
  // Ones" is the sanctioned translation). Compiled from the note so GPT-6 and
  // whatever follows leak nowhere, without waiting for a list edit.
  if (blocklist.notes?.gpt) {
    compiled.push({ term: 'GPT', category: 'foundries', regex: termRegex('GPT') });
  }
  return {
    compiled,
    exemptWings: new Set(blocklist.categories.exemptions?.wings ?? []),
  };
}

function termRegex(term) {
  // Escape, then let multi-word terms match across spaces/hyphens/nbsp.
  const escaped = term
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s\\u00A0-]+');
  // Suffix tolerance: 's, s', plural s/es. Boundaries: \b handles hyphens and
  // punctuation on both sides ("Altman-esque", "(Altman)", "Altman,").
  return new RegExp(`\\b${escaped}(?:['’]s|s['’]?|es)?\\b`, 'gi');
}

/**
 * Run the gate over a text.
 * @param {string} text
 * @param {object} opts
 * @param {object} opts.gates  output of compileBlocklist
 * @param {string} [opts.wing] content wing slug; exempt wings pass untouched (§0.1a)
 * @returns {{pass: boolean, exempt: boolean, matches: Array<{term, category, match, index}>}}
 */
export function checkText(text, { gates, wing = null }) {
  if (wing && gates.exemptWings.has(wing)) {
    // The telescope reports the real world; the gate stands aside, on purpose,
    // by rule, and says so on the record.
    return { pass: true, exempt: true, matches: [] };
  }
  const matches = [];
  for (const { term, category, regex } of gates.compiled) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push({ term, category, match: m[0], index: m.index });
      if (m.index === regex.lastIndex) regex.lastIndex++; // zero-width guard
    }
  }
  matches.sort((a, b) => a.index - b.index);
  return { pass: matches.length === 0, exempt: false, matches };
}

/**
 * The unseen-entity logger: capitalized multi-word names in a (factual)
 * bulletin that neither the blocklist nor canon knows. Not a gate — a watch
 * list for the human editor. False positives are cheap; a missed new
 * foundry-baron is not.
 *
 * @param {string} text            bulletin text (real names allowed here)
 * @param {object} opts
 * @param {object} opts.gates      compiled blocklist
 * @param {Set<string>} [opts.knownNames]  canon aliases (lowercased)
 * @returns {string[]} candidate names, deduped, order of first appearance
 */
export function findUnseenEntities(text, { gates, knownNames = new Set() }) {
  const candidates = [];
  const seen = new Set();
  // Two-plus capitalized words in a row: the shape of a person or an institution.
  const re = /\b([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*)+)\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (knownNames.has(key)) continue;
    // Already blocklisted names are not "unseen" — the gate knows them.
    const { matches } = checkText(name, { gates });
    if (matches.length > 0) continue;
    candidates.push(name);
  }
  return candidates;
}
