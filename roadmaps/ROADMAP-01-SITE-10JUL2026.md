# ROADMAP-01 — THE SITE (spacepope.ai)
**Version:** 0.1 — 10JUL2026 · **Parent:** ROADMAP-00-OVERVIEW
**Stack:** Astro (static) + content collections · Fly.io static deploy · domain spacepope.ai

---

## 1. DESIGN LANGUAGE — "COSMIC STAINED GLASS"

The Vatican observing the galaxy: illuminated-manuscript gravity over deep space. Everything slightly too formal for its own content — the design plays it straight so the words can be funny.

- **Palette:** near-black space (#0b0a12), deep cathedral purple, gold-leaf accent (#c9a227 family), starfield noise. Stained-glass gradient panels as section dividers (SVG, geometric rose-window motifs with planets in the lights).
- **Type:** a serious serif for body and headlines (Cormorant Garamond or EB Garamond — encyclical energy), small-caps Latin labels, drop caps on Chronicle chapters and Encyclicals. Monospace only in About/Acta Diurna (the machinery shows its terminal voice there).
- **Mascot:** Ace's Crocodylus Pontifex (mascot/crocodylus-pontifex-mascot-by-ace-20260705.png) — hero placement on About and the Angelus masthead. Credit: "Pontifical portrait by Ace."
- **The standing disclaimer** (Hard Rule §0.6) in the footer of every page: parody, fiction, commentary; no real persons depicted; the Bulletins wing reports real events with citation.

## 2. INFORMATION ARCHITECTURE

```
/                      → The Chronicle (the novel — latest chapter hero + archive)
/chronicle/[n]         → individual chapters, prev/next, "story so far" sidebar (from digest)
/observer/             → The Galactic Observer (satirical Dispatches blogroll)
/observer/[slug]       → dispatch + the owning Cardinal's commentary, byline + See sigil
/specola/              → Bulletins of the Specola Galactica (factual, cited)
/specola/[slug]        → bulletin with citation links, Nihil Obstat + Imprimatur stamps in the colophon
/encyclicals/          → the prestige pieces
/angelus/              → weekly papal reflections (later: embedded Address video)
/college/              → the College of Cardinals — profile cards: See, sigil, character, doctrinal lean, "powered by" model attribution (the joke AND the demo)
/atlas/                → the Atlas of the Communion — map + registries rendered from world/*.json at build time
/about/                → Sub Capa: architecture SVG, cast table, pipeline explanation, repo link, parody disclaimer long-form
/acta/                 → Acta Diurna — published run-logs, one page per pipeline run (agent trace, gate verdicts, badger interventions)
```

## 3. CONTENT COLLECTIONS (Astro)

| Collection | Source | Frontmatter (key fields) |
|---|---|---|
| `chronicle` | pipeline-generated | n, title, date, dispatchRef, threadsTouched[], wordCount |
| `observer` | pipeline-generated | title, date, bulletinRef, cardinal (owner), see, model, imprimatur |
| `specola` | pipeline-generated | title, date, citations[{title,url,source}], nihilObstat, storyIds[] |
| `encyclicals` | pipeline or hand-written | incipit, date, feast |
| `angelus` | pipeline-generated weekly | weekOf, chaptersCovered[], videoUrl? |
| `acta` | pipeline run-log JSON → page | runId, date, stages[], verdicts[], retries[], modelsUsed[], cost |

All generated content is plain markdown + frontmatter committed by the pipeline — the site never calls an LLM at build time. Site and pipeline are decoupled by the git commit boundary.

## 4. COMPONENTS WORTH BUILDING PROPERLY

- **StampColophon** — the Nihil Obstat / Imprimatur seals (SVG stamps with date + gate verdict). Every published piece carries its QC provenance like a colophon. Transparency as ornament.
- **CardinalByline** — sigil, name, See, and the substrate attribution ("a grown mind of House Misrule"). Model attribution is canon-truthful (Casting §D: substrate is in-universe truth).
- **StorySoFar** — collapsible digest sidebar on chapter pages, sourced from world/chronicle-digest.md at build.
- **AtlasMap** — SVG starmap of the Sees (the real exoplanet systems! plot actual RA/dec if we're feeling fancy) with hover cards from places.json.
- **ArchitectureDiagram** — the About page SVG of the full pipeline (hand-crafted, animated flow dots if time allows; this is the hackathon-About-page move).
- **BadgerFlag** — the fail-honest banner for pieces published with a flag ("The Badger notes: …").

## 5. BUILD ORDER (Phase 0 + slices of 1/3)

1. `npm create astro` scaffold, collections config, base layout + palette + type + footer disclaimer.
2. Section index pages with placeholder content (one hand-written founding Dispatch — Jim's House Babel fragment §III is ready-made seed content, already Hard-Rule-scrubbed).
3. College page from a `college.json` cast file (static, hand-authored from Dictionary §D).
4. Fly.io deploy (static preset, same pattern as Sibling Dynamics), DNS for spacepope.ai.
5. StampColophon + CardinalByline + BadgerFlag components.
6. Atlas + About + Acta pages when their data sources exist (Phase 2/3).

## 6. ACCEPTANCE

- Builds green, deploys to Fly, responsive at 375/768/1440 (Playwright screenshots).
- Footer disclaimer on every route. Mascot credited. No real names anywhere in fictional sections (grep gate as CI check — the Inquisitor runs on the SITE too, not just the pipeline).

## CHANGELOG
- **0.1 — 10JUL2026** — founding site roadmap.
