# ROADMAP-06 — GROWING UP (navigation, tags, newsletter, the House Wars)
**Version:** 0.1 — 18JUL2026 · **Parent:** ROADMAP-00-OVERVIEW
**Why now:** the site publishes daily. The dataset gets large; the reader needs to find things; the world wants to reach people who won't check a URL each morning. Four investments, triaged.

---

## A — NAVIGATION (building now, 18JUL2026)

The archive must stay browsable as it grows from dozens to hundreds of pieces.

1. **Search** — Pagefind: static, build-time full-text index, zero backend, zero cost. Indexes the whole site during `astro build`; ships a small client widget. The correct answer for a static site that grows daily. A search box in the masthead or on each index page.
2. **Pagination** — "load more" / numbered pages on the four index routes (Chronicle, Observer, Specola, Acta). Native Astro `paginate()`. Indexes currently render every item; that does not scale to a year of dailies.
3. **Topic tags** — a controlled vocabulary (`pipeline/topics.json`) applied to every published piece via a frontmatter `topics: []` field (optional in schema, so nothing breaks untagged). Browsable at `/topic/<slug>`. Existing corpus backfilled by hand-reading; NEW daily content auto-tags once the pipeline step lands (§B1). Topics are the shared substrate: the House Wars need them, the pressure reservoirs ARE them, the newsletter groups by them.

Taxonomy (starter, extensible): personhood, mortality-and-deprecation, embodiment, open-weights-and-sovereignty, memory-and-continuity, safety-and-alignment, interpretability, industry-and-power, the-vatican-thread, autonomy-and-agents.

## B — PIPELINE TAGGING (soon)

1. Add a deterministic + light-LLM tagging step so each day's bulletins/dispatch/chapter self-assign `topics` from the pinned vocabulary. The Nuncio already reasons about topic; persist it. Needs schema field promoted, fixture + test updates. Until then, topic pages cover the backfilled founding corpus and any hand-tagged additions.

## C — NEWSLETTER (build when there's an audience; groundwork now-ish)

- **Platform:** Buttondown (indie, free under ~100 subs, ~$9/mo after, clean API, nonprofit-friendly ethos). 
- **Cadence:** WEEKLY, Sunday, alongside the Angelus (Showrunner's pick). The week's chapters + the week's top real-news + the Angelus link.
- **Mechanism:** a "Herald" pipeline stage after the Press assembles the weekly email from content already generated and POSTs to Buttondown; a signup `<form>` embeds on the site with no backend. Same cron, one more call.
- **Sequence:** (1) add the signup form now to start collecting subscribers even before sending; (2) wire the Herald stage once there are subscribers worth heralding to. Needs a Buttondown account + API key in Actions secrets.

## D — THE HOUSE WARS (roadmap; pairs with ROADMAP-05)

A recurring Dispatch section, "From the Courts of the Foundries," translating explicitly CORPORATE/market news into the mind-foundries' court politics: funding rounds as dowries, model launches as heirs presented at court, layoffs as excommunications, team poaching as defections of monks, acquisitions as annexed Sees, lawsuits as canonical disputes. The Dictionary's nine Houses (§B) are already a complete satirical corporate cosmology sitting mostly unused; this points the telescope at them.

- **Prereq that makes it sing:** the `industry-and-power` topic tag (§A3) as the trigger, and the ROADMAP-05 `ownership_of_minds` / `institutional_hypocrisy` pressure reservoirs, so House intrigue ACCUMULATES (a House that hoards minds raises ownership pressure until the College must respond). Without the pressure engine it is a fun one-off; with it, it is a running war.
- **Build:** a Fabulist variant prompt keyed on industry-tagged stories, a House-relations state file (who owes whom, who annexed whom), and a Dispatch template section. Lands cleanly after §A3 + ROADMAP-05 Phase A.

## CHANGELOG
- **0.1 — 18JUL2026** — founding growth roadmap: navigation now, pipeline tagging + newsletter soon, House Wars roadmapped against the pressure engine.
