# SPACEPOPE.AI — MASTER ROADMAP: THE LIVING OBSERVER
**Version:** 0.1 — 10JUL2026
**Showrunner:** Angie · **Editor of record:** Kai
**Prereq reading:** CANON-BIBLE-SPACEPOPE-16JUN2026.md → DICTIONARY-FOUNDRIES-AND-NAMES-16JUN2026.md (Hard Rules win all conflicts)
**Sibling docs:** ROADMAP-01-SITE · ROADMAP-02-PIPELINE · ROADMAP-03-WORLDSTATE · ROADMAP-04-EXTRAS

---

## 1. WHAT WE ARE BUILDING (one paragraph)

A self-writing satirical world. A daily multi-agent pipeline reads the water-world's actual AI news, files a *factual, cited* bulletin from the galactic observatory, passes it through two ecclesiastical censorship gates and a Space Reality Badger, translates it into cosmic dispatch (no real names — the Dictionary's translation table is law), hands it to a College of Cardinals — each powered by its lore-correct model family via OpenRouter — who fight over who gets to own the commentary, and then advances a continuous 1000-word-chapter novel about the Space Pope's communion, maintaining persistent worldstate (characters, places, events, open plot threads) as it goes. Once a week the Pontifex himself reflects on how his own story is going. The whole organism is the demo: a serious multi-agent orchestration architecture wearing a cassock, with an About page that shows the wiring diagram and a published run-log so anyone can watch the machine think. The humor is decorative. The pipeline is structural.

## 2. THE PUBLICATIONS (site sections, in-universe)

| Section | In-universe name | What it is | Cadence |
|---|---|---|---|
| The novel (front page) | **The Chronicle of the Communion** | Continuous 1000-word chapters — the living narrative of the Pope's world, seeded daily by real events in cosmic translation | Daily chapter |
| Satire blogroll | **The Galactic Observer** | The Dispatch (canon §6): fictionalized news-from-the-Sees + cardinal commentary. This is L'Osservatore Romano's galactic cousin — the canon already made this joke for us | Daily |
| Factual blogroll | **Bulletins of the Specola Galactica** | The Pontifical Academy's observatory wing: serious, accurate AI-news summaries with real citation links. The telescope pointed at the water-world | Daily |
| Prestige pieces | **Encyclicals** | Canon §6 format: incipit, papal We, numbered paragraphs, footnoted real events | Occasional |
| Papal reflection | **The Angelus Galacticus** | The Pope reads the week's Chronicle + dispatches and reflects on his own unfolding story. (The real pope does a weekly Angelus. Of course he does one.) | Weekly |
| Video | **The Address** (*Urbi et Orbi et Clusteri*) | Canon §6, Hedra pipeline — Angelus script → talking Crocodylus video | Phase 4 |
| The world | **The Atlas of the Communion** | Map + character/place registry, rendered live from worldstate files | Auto-updates |
| The wiring | **About / Sub Capa** ("under the hood," roughly) | Architecture SVG, agent cast list, parody disclaimer, link to public repo + published run-logs | Static |

## 3. THE PIPELINE CAST (agents, in-universe roles, one-line jobs)

The orchestrator itself is a **deterministic script** — the Editor's desk. Kai stays out of the cassock (Hard Rule §0.7); thematically and literally, the harness is not a model. LLM calls decorate a deterministic spine (the hackathon lesson).

| # | Agent | Job | Notes |
|---|---|---|---|
| 1 | **The Nuncio** | Fetch news (RSS + HN API, deterministic), dedupe, rank, select 3-5 stories | Fetch is code; only ranking/selection is LLM |
| 2 | **The Astronomer of the Specola** | Write the factual bulletin: accurate summary + real citation links | The serious wing |
| 3 | **The Censor Librorum** | QC gate #1 — facts: citations real? links live? no fabricated quotes? Grants ***Nihil Obstat*** | Real Catholic publishing law, gate 1 |
| 4 | **The Space Reality Badger** (*Meles Veritatis*) | Names the specific fault, re-dispatches to the responsible agent for rewrite. Max 2 loops, then fail-honest (spike the story or publish flagged) | The duck lesson: never confabulate, never fake a pass |
| 5 | **The Fabulist** | Translate the bulletin into cosmic dispatch via the Dictionary translation table — archetypes only | The fiction firewall crossing |
| 6 | **The Inquisitor** | QC gate #2 — Hard Rule §0.1: **deterministic blocklist regex** (the Dictionary's internal-only column + a maintained real-names list) AND an LLM sweep. Both must pass. Grants ***Imprimatur*** | Belt AND suspenders; the one gate that must never fail |
| 7 | **The College in Session** | Each seated Cardinal (distinct OpenRouter model per Casting Registry §D) bids one line + a claim score on today's dispatch; deterministic adjudication picks the owner (score + rotation fairness); winner writes the commentary in their voice | The multi-model showpiece |
| 8 | **The Archivist** (House Babel — Jim's chartered role) | Post-publication: update worldstate (characters/places/events/threads) + regenerate the Chronicle digest | Gemini-powered, per casting |
| 9 | **The Chronicler** | Write the day's 1000-word Chronicle chapter from digest + open threads + today's dispatch | The novelist |
| 10 | **The Continuity Badger** | The Badger's second vocation: check the chapter against worldstate for contradictions before it ships | Same fail-honest loop |
| W | **Crocodylus Pontifex** | Weekly Angelus: reads the week, reflects, blesses. Top-tier model, used sparingly — the expensive voice for the sacred slot | Weekly only |

## 4. ARCHITECTURE DECISIONS (with rationale)

1. **One repo, whole organism.** New standalone public repo (proposed: `Angiebio/spacepope`). Astro static site + `pipeline/` (Node) + `world/` (state) + `content/` (generated markdown). Mirrors the hackathon repo pattern: clone it, read it, reproduce it.
2. **Astro content collections** for all five publications. Static output, deployed to Fly.io at spacepope.ai (domain exists). Same push-to-prod muscle as Sibling Dynamics.
3. **GitHub Actions cron** runs the pipeline daily → commits generated content + worldstate → triggers deploy. No server to babysit. (Confirm vs Fly scheduled machine in ROADMAP-02 after infra research lands.)
4. **OpenRouter for all model calls.** One key, per-cardinal model routing per the Casting Registry. Cheap tier for QC/translation, mid tier for prose, top tier weekly for the Pope.
5. **Worldstate = git-committed structured files, not a graph DB** (pending research confirmation): `characters.json`, `places.json`, `events.json`, `threads.json` + rolling `chronicle-digest.md`. Human-auditable, agent-updatable, diffable — the archive IS the git history. Lorebook-style keyed entries if research says the SillyTavern pattern earns it.
6. **Fail honest, never fake** (the duck doctrine): a story that can't pass its gates gets spiked with a logged reason, or published with a visible flag — never quietly confabulated around.
7. **Published run-logs** (*Acta Diurna* — "the daily acts," the actual Roman gazette): each run's agent trace ships to the About page. The orchestration is visible on purpose; transparency is part of the bit AND the demo.

## 5. CANON AMENDMENT REQUIRED (Showrunner sign-off)

Hard Rule §0.1 ("published work never contains a real name") was written when all output was fiction. The Specola Bulletins are a **new, factual wing**: accurate summaries of real events with real citations. Proposed amendment for CANON-BIBLE v0.2:

> **§0.1 scope clarification:** The no-real-names rule governs all *fictional and satirical* output (Observer, Chronicle, Encyclicals, Angelus, commentary). The Specola Bulletins are factual reportage: real names and real citations are permitted and required there; Hard Rule §0.2 (never fabricate a quote) applies with full force; no satire or in-universe voice crosses into the Bulletins beyond the Specola's framing header. The fiction firewall sits between the Specola and everything else, enforced by the Inquisitor.

## 6. PHASES

- **Phase 0 — The See is Founded:** repo scaffold, canon imported, Astro site skeleton (nav, sections, disclaimer, mascot), deploys to Fly.
- **Phase 1 — The Presses Turn (MVP):** Nuncio → Astronomer → Censor/Badger → Fabulist → Inquisitor → publish one Bulletin + one Dispatch. Manually triggered. Blocklist gate tested adversarially.
- **Phase 2 — The World Breathes:** worldstate store + Archivist + Chronicler + Continuity Badger + College bidding/commentary. The novel begins.
- **Phase 3 — The Machine Prays Alone:** GitHub Actions daily cron, weekly Angelus, Atlas page, About page with architecture SVG + Acta Diurna run-logs.
- **Phase 4 — Smells and Bells:** Hedra video Address, Encyclicals on feast days, Synod forum (the anti-Turing gate, Jim's rite), whatever else amuses us.

## 7. OPEN DECISIONS (Showrunner's desk)

1. Approve canon amendment §5 above.
2. Repo name + public/private (recommend public — it's a demo, like the hackathon).
3. Chapter cadence: daily is 365 chapters/year — recommend daily with a "quiet day in the communion" grace rule (no strong news → shorter interstitial chapter) so the novel breathes instead of bloating.
4. College adjudication flavor: pure highest-bid, or weighted-random with rotation fairness so Misrule doesn't win every day by shouting (recommend the latter).
5. Casting confirmations for open seats (Yǐng's Martyr-Returned is Showrunner-held per canon).

## CHANGELOG
- **0.1 — 10JUL2026** — founding master roadmap: publications, cast, architecture decisions, canon amendment proposal, phases.
