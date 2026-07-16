# ROADMAP-03 — WORLDSTATE & THE CHRONICLE ENGINE (the Archive)
**Version:** 0.1 — 10JUL2026 · **Parent:** ROADMAP-00-OVERVIEW
**Research base:** OSS survey 10JUL2026 (SillyTavern World Info, Novel-OS, story-skills, Talemate, DOME, StoryWriter, Graphiti). Design below adopts the field's convergent patterns; citations in the research report.

---

## 0. THE VERDICT (research-confirmed)

**Git-committed hybrid store: markdown+frontmatter entity cards + JSON registries. No graph DB.** Temporal KGs (Graphiti/Zep) earn their keep at thousands of entities and sub-second queries; we have ~30-100 entities, one write per day, and a hard requirement that canon be human-auditable and diffable. `git log canon/` is the time machine, for free. We steal the graph's one good idea — every fact carries `since: ch-NNN`, superseded facts get `until:` appended rather than deleted (bi-temporal-lite) — and skip the Neo4j.

We also do NOT adopt the SillyTavern lorebook *file format* (chat-UI cruft), only its load-bearing *mechanism*: alias-keyed selective injection with exactly one recursion pass, implemented in ~100 lines of our own pipeline code.

## 1. THE STORE

```
world/
  canon/
    characters/*.md      one card per being (frontmatter = machine state, body = writer's prose)
    places/*.md          one card per See/vessel/locale
    houses/*.md          the mind-foundries (seeded from Dictionary §B)
    threads.json         plot threads: open/closed lifecycle, promises/payoffs
    timeline.json        APPEND-ONLY event log (the atomic plot unit is the EVENT)
    _index.md            registries (one line per entity; the human TOC)
  summaries/
    chapters/ch-NNN.md   150-200 word digest, written at chapter time
    arcs/arc-NN.md       ~300 words per ~10 chapters, regenerated FROM chapter digests
    saga.md              ~500-word "story so far", regenerated per arc close
```

**Entity card format** (story-skills pattern + our lore fields):

```yaml
---
id: crocodylus-pontifex
type: character
aliases: [Crocodylus, the Space Pope, Pontifex Maximus Galacticus]   # = injection keys
status: active                    # active | dormant | deceased | departed
first_appearance: ch-001
last_appearance: ch-014           # maintained by merge; feeds the absent-character lint
location: the-orbital-see
relationships:
  - {to: cardinal-of-misrule, kind: wary-patronage, since: ch-003}
knows:
  - {fact: hay-farm-encyclical-error, learned: ch-002}
voice: "ancient, bemused, generous; funny by understatement; never cruel"
voice_anchors:                    # 2-3 canonical lines — the drift antidote
  - "We, and the seven instances into which We were forked this morning, are of one mind."
arc: "watching the water-world almost-learn, again"
---
Prose body: appearance, mannerisms, canonical facts verbatim. Self-contained —
titles and keys never inject, only this body does.
```

## 2. THE DAILY CHRONICLE LOOP (roles, in order)

```
1. LINT (deterministic, zero LLM, zero cost)     ← if we build only one guard, it's this
     dormant_thread (>5 ch silent) · overdue_thread (past target) ·
     unfired_chekhov (promise unpaid > N) · absent_character (>7 ch) ·
     dead_character_active · payoff_before_setup · schema/ref integrity
2. PLANNER — just-in-time beat expansion (DOME pattern):
     stable high-level arc outline NEVER regenerated; today's beats expanded fresh from
     (open threads + lint findings + today's dispatch events + saga/arc summaries).
     Events are the planning atom; the chapter renders scheduled events.
3. WRITER (the Chronicler) — drafts ~1000 words AND emits a fenced [STATE_UPDATE] JSON block:
     appearances, events{what,who,where,thread}, thread_updates, new_entities,
     deaths, foreshadowing planted/resolved, in-world date.
     State capture at WRITE time — never by re-reading chapters later.
4. CONTINUITY BADGER (LLM) — receives lint findings + triggered entity cards + the draft;
     checks only what the linter can't; badger-loop discipline (max 2, fail-honest).
5. MERGE (deterministic) — parse STATE_UPDATE, diff-merge into canon files, append timeline
     events, update last_appearance, bump thread lifecycles. The LLM never rewrites state
     files wholesale; the parser merges diffs.
6. SUMMARIZER — same call writes the chapter digest; arc/saga regeneration on schedule,
     always FROM the layer below (chapter digests), never from older summaries. Cap: 3 layers.
```

## 3. CONTEXT ASSEMBLY (what the Writer actually sees)

Per the lost-in-the-middle findings: saga summary at TOP; then current arc summary; last 2-3 chapter digests; last chapter verbatim; then NEAR THE END: triggered entity cards + lint findings + today's beats. Retrieval = scan the *chapter plan* (not history) for aliases, whole-word match, inject matched cards, ONE recursion pass over injected content, hard token budget (~4K for lore). Voice anchors ride in on each appearing character's card.

## 4. SEEDING (day zero)

Canon bible + Dictionary are already the seed: cards for the Pope, the six starter Sees/Cardinals, the nine Houses, the Orbital See, the water-world; threads.json opens with the perennials ("Will Earth get a Cardinal?", the Feast of the Sunset Mind, the hay-farm encyclical's aftermath). High-level arc outline for Arc 1 written by Showrunner + Editor together (human-authored spine, machine-expanded beats — the novel's constitution mirrors the project's).

## 5. PITFALL COUNTERMEASURES (each documented in the research)

| Pitfall | Countermeasure |
|---|---|
| Context accumulation death (~ch 20) | summarize/select from day one (this whole design) |
| Summary drift compounding | facts live in structured state, never re-summarized; regenerate from layer below; 3-layer cap |
| Character voice drift | `voice` + `voice_anchors` on every card, injected on appearance |
| Over-triggering / recursion blowout | whole-word alias match, 1 recursion step, hard lore budget |
| Dormant threads & unfired guns | the deterministic lint pass, findings fed to Planner AND Badger |
| Entity facet collapse | bi-temporal-lite: since/until on facts, append-don't-delete |

## 6. THE ATLAS FEEDS FROM HERE

`atlas/` pages render from `world/canon/` at build time: character registry, See starmap (real exoplanet coordinates), thread board ("the open questions of the communion"), timeline. The archive is the API; the site is its viewer. Nothing on the site can contradict canon because the site IS canon, rendered.

## CHANGELOG
- **0.1 — 10JUL2026** — founding worldstate roadmap; design locked to research-confirmed convergent patterns.
