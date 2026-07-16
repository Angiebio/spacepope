# spacepope.ai — agent build guide

You are working inside The Galactic Observer: a satirical multi-agent publishing organism.
**Load order before touching lore:** `canon/CANON-BIBLE-SPACEPOPE-13JUL2026.md` (v0.2) →
`canon/DICTIONARY-FOUNDRIES-AND-NAMES-16JUN2026.md`. Hard Rules win every conflict.

## The rules that bind builders (not just characters)

1. **No real names in fictional content, ever** (Hard Rule §0.1). The Specola Bulletins
   (factual wing) are the ONLY exception (§0.1a). Seed content, sample fixtures, page copy —
   all of it obeys. When writing test fixtures that deliberately contain real names, mark the
   file `// ADVERSARIAL FIXTURE — leaks on purpose; must be caught` at the top.
2. **Deterministic spine, LLM decoration.** Anything that CAN be code IS code (fetching,
   parsing, merging, adjudication math, blocklist regex). LLM calls are pure functions
   against schemas in `pipeline/lib/schemas.mjs`.
3. **Fail honest, never fake** (the duck doctrine): unpassable work gets spiked with a
   logged reason or published with a visible flag. No silent fallbacks, no confabulated passes.
4. **Philosophical comments** (house rule, IEEE-validated): each module opens with a comment
   explaining WHY it exists — engineering register and, where it fits, ecclesiastical register.
   Plus normal dev comments. See existing files for the tone.
5. **File headers carry version + date** (DDMMMYYYY) per house code notes; increment on edit.
6. **Contracts are pinned:** `src/content.config.ts` (collections), `pipeline/lib/schemas.mjs`
   (LLM I/O), `pipeline/casting.json` (models — PINNED slugs, never `latest`),
   `pipeline/blocklist.json`, `pipeline/sources.json`, `world/canon/` formats
   (see `characters/crocodylus-pontifex.md` for the card format). Change a contract = change
   its consumers and tests in the same commit.
7. **Tests** follow house structure: `tests/test_plans/*.md`, `tests/<name>/`, reports in
   `tests/<name>/reports/`.

## Layout

- `src/` Astro static site (NEVER calls an LLM at build time; renders `content/` + `world/`)
- `pipeline/` the Editor's desk (Node ESM, OpenRouter, runs in GitHub Actions cron)
- `world/` living worldstate (git IS the database)
- `content/` generated publications (specola, observer, chronicle, encyclicals, angelus, acta)
- `roadmaps/` the plans — ROADMAP-00 is the constitution of the build itself

## Dev server

Use background mode: `astro dev --background`; manage with `astro dev stop|status|logs`.
