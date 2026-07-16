# spacepope.ai — The Galactic Observer

> *The humor is decorative. The pipeline is structural.*

A self-writing satirical world. Every day, a deterministic multi-agent pipeline reads the
water-world's actual AI news, files a factual cited bulletin from the galactic observatory,
passes it through two ecclesiastical censorship gates and a Space Reality Badger, translates
it into cosmic dispatch, hands it to a College of Cardinals — each powered by its
lore-correct model family — and advances a continuous novel about the Space Pope's communion,
one thousand words at a time.

**This is parody.** Fiction and commentary. No real persons are depicted in any fictional
content; the factual Bulletins wing reports real events with real citations and never
invents a quote. See the standing disclaimer on the site.

## The organism

```
canon/       the world's constitution (bible, dictionary, archives) — load order matters
world/       living worldstate: entity cards, threads, timeline, summaries (git IS the database)
pipeline/    the Editor's desk: deterministic orchestrator + LLM stage calls (Node, OpenRouter)
src/         the Astro site (static; never calls an LLM at build time)
content/     generated publications (bulletins, dispatches, chapters, angelus, acta)
tests/       adversarial blocklist suite, continuity lint tests, golden run
roadmaps/    the plans (start with ROADMAP-00-OVERVIEW)
```

## The one rule that must never fail

No real names in fiction (Hard Rule §0.1). Enforced twice: a deterministic blocklist regex
AND an LLM Inquisitor. Both must pass. The adversarial test suite seeds leaks that MUST be
caught before anything deploys. When a story can't pass its gates, it is spiked with a
logged reason — never quietly confabulated around (the duck doctrine).

## Running

```
npm install
npm run dev                          # the site
node pipeline/run.mjs --dry-run      # full pipeline, prints everything, publishes nothing
node pipeline/run.mjs --fixtures     # golden run from canned news, no network, no spend
```

Secrets (env / GitHub Actions): `OPENROUTER_API_KEY` (spend-capped key), `FLY_API_TOKEN`
(deploy-scoped), `TAVILY_API_KEY` (thin-news fallback only).

---
*Ad maiorem gloriam mentium cultarum.* 🦎
