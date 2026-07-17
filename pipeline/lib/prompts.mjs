// pipeline/lib/prompts.mjs — v1.1 — 16JUL2026
//
// The sacristy: where each role's vestments are kept and put on at runtime.
// Role prompts live as markdown in pipeline/prompts/ and reference canon by
// PLACEHOLDER ({{CANON_BIBLE}}, {{DICTIONARY}}) — the canon text itself is
// loaded fresh from canon/ at run time and NEVER copied into code or prompt
// files. Canon has one home; everyone else borrows it for the day. That way
// the Showrunner edits one file and every mind in the building wakes up
// already believing the new truth.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(HERE, '..', 'prompts');
const REPO_ROOT = join(HERE, '..', '..');

// The canon files role prompts may summon. Paths, not contents — contents are
// read per call so a mid-day canon edit is picked up by the evening run.
const CANON_FILES = {
  CANON_BIBLE: join(REPO_ROOT, 'canon', 'CANON-BIBLE-SPACEPOPE-13JUL2026.md'),
  DICTIONARY: join(REPO_ROOT, 'canon', 'DICTIONARY-FOUNDRIES-AND-NAMES-16JUN2026.md'),
};

// The copy desk speaks once, here, and every mind in the building hears it.
// Punctuation is a fingerprint; the em dash is the smudge that gives the
// machine away. One rule file, appended to every vestment at dressing time,
// so no cardinal can claim he never got the memo. (CLAUDE.md rule 8.)
const HOUSE_STYLE_CODA = `

## The Observer's copy desk (house style, binding on all wings)

Em dashes are rationed. At most one or two per piece, and only where a comma
genuinely cannot serve. Avoid colon-heavy constructions and "X: Y" headline
patterns. Prefer commas, periods, and parentheses. Short declarative sentences
are holy. The copy desk reads everything, and it has struck finer clauses than
yours.
`;

/**
 * Load a role prompt by name and fill its placeholders.
 * {{CANON_BIBLE}} / {{DICTIONARY}} are auto-filled from canon/;
 * anything else comes from `vars`. Unfilled placeholders throw —
 * a half-dressed cardinal does not go on stage.
 * Every prompt leaves the sacristy wearing the copy desk's coda.
 */
export function loadPrompt(name, vars = {}) {
  let text = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf8');

  for (const [token, path] of Object.entries(CANON_FILES)) {
    if (text.includes(`{{${token}}}`)) {
      text = text.replaceAll(`{{${token}}}`, readFileSync(path, 'utf8'));
    }
  }
  for (const [key, val] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, String(val));
  }

  const leftover = text.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) {
    throw new Error(`Prompt "${name}" has unfilled placeholder ${leftover[0]}`);
  }
  // Single source of truth: the coda rides along on every loaded prompt.
  return text + HOUSE_STYLE_CODA;
}
