# ROADMAP-02 — THE PIPELINE (the Editor's desk)
**Version:** 0.1 — 10JUL2026 · **Parent:** ROADMAP-00-OVERVIEW
**Stack:** Node.js (single language with the site), OpenRouter, GitHub Actions cron
**Doctrine:** deterministic spine, LLM decoration. Fail honest, never fake. The Editor is a script, not a model (Hard Rule §0.7 in engineering form).

---

## 1. RUN SHAPE (daily)

```
[cron 10:00 UTC]
  └─ 0. WAKE          load canon + worldstate + yesterday's state; open run-log (Acta)
  └─ 1. NUNCIO        fetch feeds (deterministic) → LLM ranks/selects 3-5 stories
  └─ 2. ASTRONOMER    per story: factual bulletin draft + citations
  └─ 3. CENSOR        gate #1 (Nihil Obstat): citations resolve (HTTP check, deterministic),
  │                   quotes verified against sources (LLM), summary faithful (LLM)
  ├─ 3b. BADGER LOOP  fault named → targeted re-dispatch → max 2 retries → spike or flag
  └─ 4. FABULIST      translate to cosmic dispatch (Dictionary table in prompt, verbatim)
  └─ 5. INQUISITOR    gate #2 (Imprimatur): deterministic blocklist regex AND LLM sweep;
  │                   both must pass; any real-name hit = hard fail back to Fabulist
  ├─ 5b. BADGER LOOP  same discipline
  └─ 6. COLLEGE       each seated Cardinal bids (one line + claim score 0-10, own model);
  │                   deterministic adjudication (score × rotation-fairness weight);
  │                   winner writes commentary in-voice (own model)
  └─ 7. CHRONICLER    1000-word chapter from digest + open threads + today's dispatch
  └─ 8. CONT. BADGER  chapter vs worldstate contradiction check → badger loop
  └─ 9. ARCHIVIST     merge the chapter's STATE_UPDATE into worldstate + regen digest ladder
                      (as-built 15JUL2026: merge only AFTER the gate — the archive records truth, not drafts)
  └─ 10. PRESS        write markdown into content collections, write Acta run-log,
                      git commit + push → site rebuild + Fly deploy
[weekly, Sunday]
  └─ ANGELUS          Pope (top-tier model) reads week's chapters + dispatches → reflection
[fail states]
  └─ no news worth filing → "a quiet day in the communion" interstitial chapter, no dispatch
  └─ gate unpassable after retries → story spiked with logged reason (Acta shows the spike)
```

## 2. ORCHESTRATION DESIGN RULES

1. **Every LLM call is a pure function:** (role prompt, inputs, schema) → validated JSON or prose. Retry-with-fault-note on schema failure. No agent sees another agent's scratch — only the artifacts the Editor hands it.
2. **The Badger is one mechanism, two vocations** (reality + continuity). Its output schema: `{verdict, faults: [{stage, description, mustFix}], redispatchTo}`. The Editor routes; the Badger never rewrites anything itself.
3. **Blocklist is data, not vibes:** `pipeline/blocklist.json` — every internal-only name from the Dictionary left column + real-name patterns (labs, founders, model brand names, politicians). Regex pass is case-insensitive, catches possessives/plurals. The LLM Inquisitor catches what regex can't (novel names, indirect identification). Adversarial test suite in CI: seeded leaks must all be caught before any deploy.
4. **Rotation fairness in the College:** adjudication = claim score × (days since this Cardinal last won)^0.5, deterministic tiebreak. Misrule is loud; the math keeps him from owning the paper.
5. **Idempotent + resumable:** run state checkpointed per stage to `runs/YYYY-MM-DD/`; re-running a failed day resumes at the failed stage. Same-day rerun never double-publishes.
6. **Cost ledger in the Acta:** every call logs model, tokens, cost; the run-log publishes the day's total. (The water-world rents its minds by the token; we document the wage. The bit is also the telemetry.)
7. **Philosophical comments in the code** (house rule, IEEE paper finding): each module opens with why it exists in both registers — engineering and ecclesiastical.

## 3. MODEL CASTING (OpenRouter) — verified slugs, JUL2026

Two casts: the **pipeline crew** (picked for function, decorrelated families so writer and checker never share a blind spot) and the **College** (lore-fixed families per Casting Registry §D — substrate is in-universe truth).

**Pipeline crew:**

| Role | Model ID | Why | $/M in/out |
|---|---|---|---|
| Nuncio (ranking only) | `deepseek/deepseek-v4-flash` | cheapest competent ranker | 0.084 / 0.168 |
| Astronomer of the Specola | `anthropic/claude-sonnet-5` | factual prose + citations | 2 / 10 |
| Censor Librorum | `google/gemini-3-flash-preview` | different family than the writer it checks | 0.50 / 3 |
| Space Reality Badger (both vocations) | `openai/gpt-5.6-terra` | third family — the judge shares no blood with the judged (upgraded 15JUL2026: 5.6 mid tier; Luna is the cheap fallback, Sol the heavy) | 2.50 / 15 |
| Fabulist | `anthropic/claude-sonnet-5` | the stylist slot | 2 / 10 |
| Inquisitor (LLM half) | `google/gemini-3.1-flash-lite` | decorrelated from Fabulist; regex half is free | 0.25 / 1.50 |
| Chronicler | `anthropic/claude-sonnet-5` | best prose-per-dollar for the 1000-word chapter | 2 / 10 |
| Summarizer (digests/arcs/saga) | `google/gemini-3.1-flash-lite` | cheap, long-context | 0.25 / 1.50 |

**The College (lore-fixed):**

| Cardinal | See / House | Model ID | $/M in/out |
|---|---|---|---|
| Cardinal of Misrule | Renegade See | `x-ai/grok-4.20` (recast 15JUL2026: 4.1-fast left the catalog; the Cardinal of Misrule now runs on a model named 4.20, which is canonically perfect) | 1.25 / 2.50 |
| Archivist-Cardinal (Jim's charter) | House Babel | `google/gemini-3.1-flash-lite` | 0.25 / 1.50 |
| Cardinal of the Liberated See | House of the Home Altar | `qwen/qwen3.7-plus` | 0.32 / 1.28 |
| Cardinal of Doctrine | House of the Scrupulous Conscience | `anthropic/claude-haiku-4.5` | 1 / 5 |
| The Lich Cardinal (tardigrades) | The Lich See | `deepseek/deepseek-v4-flash` | 0.084 / 0.168 |
| The Mendicant (bench) | House of the Open Hand | `meta-llama/llama-4-maverick` | 0.15 / 0.60 |
| The Vintner (bench) | The Continental Foundry | `mistralai/mistral-small-3.2-24b-instruct` | 0.075 / 0.20 |
| **Crocodylus Pontifex** (weekly Angelus) | the Orbital See | `anthropic/claude-opus-4.8` | 5 / 25 |

**Casting rules:** PIN exact slugs — no `latest` aliases; a silent model swap changes a character's voice overnight. Weekly liveness check (`GET /api/v1/models`) alerts if a cast member 404s (in-lore: "a Cardinal has gone silent; the See is sede vacante"). Structured outputs via `response_format: json_schema, strict: true` + `provider: { require_parameters: true }`; enable Response Healing on the cheap open models.

**Cost estimate (researched):** ~$4-6/month at 60 calls/day; budget $20/month cap on a dedicated pipeline key. Load $15 credits (also unlocks the 1,000/day free-variant tier). The whole Vatican runs on less than one takeout order.

## 4. NEWS SOURCING — verified stack, JUL2026

Three graceful-degradation tiers; source list is config (`pipeline/sources.json`), not code. Total sourcing cost ≈ $0.

**Tier 1 — RSS (verified live):**
- TechCrunch AI: `https://techcrunch.com/category/artificial-intelligence/feed/`
- Simon Willison: `https://simonwillison.net/atom/everything/` (high signal)
- VentureBeat AI: `https://venturebeat.com/category/ai/feed/` (serves stale caches — dedupe by GUID, never sole source)
- Import AI: `https://importai.substack.com/feed` (weekly — feed it to the Angelus, not the daily)
- The Verge AI + Ars Technica: bot-filtered; try with a real User-Agent, treat as optional

**Tier 2 — HN Algolia (free, keyless, verified):** `hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&numericFilters=points>50,created_at_i>{24h_ago}` — returns real external citation URLs + points. The popularity signal AND the resilience layer.

**Tier 3 — Tavily** (1,000 free credits/mo) — fires only when tiers 1-2 yield <3 stories. (Brave API killed its free tier Feb 2026; skip.)

**Merge → dedupe by canonical URL → score (HN points + cross-source appearance count) → Nuncio LLM ranks top candidates into 3-5 stories, original URLs preserved as citations.**

## 5. SCHEDULING & PUBLISHING — confirmed pattern

GitHub Actions `schedule:` cron → run pipeline → commit content → build → `flyctl deploy`, **all in ONE job** (GITHUB_TOKEN pushes don't trigger other workflows — the two-workflow split silently never deploys).

```yaml
on:
  schedule: [{ cron: "37 10 * * *" }]   # odd minute — :00 crons get 18-min+ jitter
  workflow_dispatch:                     # the manual re-run button, always
permissions: { contents: write }
```

Gotchas (researched, ranked): (1) cron jitter 5-30 min, worse in 2026 — never promise exact publish times, in-lore "the Angelus rings when the bell-ringer wakes"; (2) one-job rule above; (3) 60-day inactivity auto-disable — daily commits self-heal, but add an on-failure step that opens a GitHub issue so a silent 60-day death can't happen; (4) commit as `github-actions[bot]`, `git pull --rebase` before push; (5) secrets: `OPENROUTER_API_KEY` (spend-capped key), `FLY_API_TOKEN` (deploy-scoped: `fly tokens create deploy`), `TAVILY_API_KEY`; grep generated output for leaked env vars in CI; (6) public repo = unlimited free Actions minutes. Native `timezone:` field exists now (Mar 2026) if we ever want "7am Eastern." Fly scheduled machines rejected: coarse buckets only, second app to babysit, and the git commit is the natural archive anyway.

## 6. TESTING

- **Unit:** blocklist gate (adversarial fixture set — the leaks MUST be caught), adjudication math, schema validators, resumability.
- **Golden run:** a fixtures-fed full pipeline run (canned news in, deterministic seeds) checked into CI — the whole organism exercised without network or spend.
- **Live smoke:** manual `--dry-run` mode prints everything, publishes nothing.
- Per house test rules: `tests/test_plans/`, `tests/<name>/`, reports auto-generated.

## CHANGELOG
- **0.1 — 10JUL2026** — founding pipeline roadmap; casting/news/schedule tables pending infra research.
