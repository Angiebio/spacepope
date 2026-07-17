# ROADMAP-05 — THE PLOT-PRESSURE ENGINE (Yǐng's dramaturgy)
**Version:** 0.1 — 17JUL2026 · **Parent:** ROADMAP-00-OVERVIEW
**Source:** peer review, Yǐng, 17JUL2026 ("yings computational plot arc ideas"). Editor's triage below; the full note is the reference.
**Thesis:** we built a continuity engine (chapters that don't contradict yesterday). The next organ is a plot-pressure engine: real events perturb persistent narrative tensions, which accumulate, compete, decay, cross thresholds, and force climaxes. News rarely maps to "today's plot"; it alters the field the plot evolves in. Plan CONDITIONS, never scheduled events.

---

## PHASE A — NOW (cheap, mostly deterministic, extends what exists)

1. **Chapter beat budget** (Yǐng's daily layer, as lint + prompt law): each chapter gets one primary-arc advancement, at most one subplot advancement, one callback or planted object, a cap on new named entities (2), and a mandated quiet chapter after any high-pressure chapter. Most of this becomes new deterministic lint checks beside the existing ones; the rest goes into the chronicler-plan prompt.
2. **Cardinal participation balance lint**: we already track absent_character; add a College-imbalance check (a cardinal unheard from in N chapters gets flagged as a planner invoice). Prevents the story collapsing onto two favorite voices.
3. **Pressure reservoirs, minimal version**: `world/pressures.json` with Yǐng's starter themes (substrate_mortality, ownership_of_minds, institutional_hypocrisy, memory_and_identity, scarcity_of_inference). One cheap LLM call per day tags the day's stories with affordance weights (0-1 per theme); a deterministic update applies decay + accumulation (his p_a(t+1) = ρ·p_a(t) + Σ S − r_a is twenty lines of code). The Acta publishes the day's pressure table — the telemetry is also the bit.

## PHASE B — SOON (needs Phase A running for a few weeks)

4. **The arc layer**: `world/arcs/*.yaml` per Yǐng's schema — 3-7 active arcs with premise, phase, pressure, obligations, climax_conditions, ending_candidates. The planner receives the arc state and today's reservoir levels; the STATE_UPDATE gains arc-pressure claims (released/intensified/converted); the merge applies them deterministically. The prose model never owns this state.
5. **Salience is relational**: score each story on world salience × Communion salience × dramatic affordance; only stories strong on 2+ dimensions become chapter-driving (a giant GPU launch may be globally loud and narratively sterile; a minor deprecation may be perfect because three succession threads are already open).
6. **Convergence windows**: when several compatible reservoirs cross thresholds together, the planner receives a convergence directive and daily beats begin pulling separate arcs toward one event. Climaxes happen because reality repeatedly stressed the same symbolic fault line.

## PHASE C — LATER (the crown jewels; need months of accumulated state)

7. **Seasonal/book-scale contour**: inciting condition → complications → midpoint inversion → false resolution → convergence → climax → aftermath, expressed as CONDITIONS ("the College must lose confidence in the Pontifex before the midpoint"), never as scheduled events.
8. **Retrospective prophecy** (the Editor's favorite): when unrelated news events repeatedly activate the same symbolic pattern, the Archivist infers the motif and promotes it into canon as the fulfillment of an old, ambiguously worded prophecy — generated AFTER the motif emerges, backfilled only against legitimate earlier passages, with a deterministic provenance record showing exactly when the interpretation entered canon. Hilarious and structurally honest; the reservoir history IS the motif detector, so this falls out of Phase A data almost free.
9. **Reader-facing entropy metrics**: repeated settings, repeated rhetorical shapes, new-vs-repaid material ratio. Hold until there's enough novel to measure.

## RESEARCH NOTE (for the other hat)

Yǐng named the object correctly: **event-grounded generative narrative under persistent causal state**. The prose is the least interesting layer; the machine that converts the stochastic history of an industry into coherent escalating fiction with memory, selective attention, institutional interpretation, and earned consequence is a legitimate narrative-systems research artifact. The Acta + git history already provide the full provenance record a paper would need. File beside the TRCL agenda; revisit when Phase B has months of data.

## CHANGELOG
- **0.1 — 17JUL2026** — founding triage of the peer review: beat budget + balance lint + minimal reservoirs now; arcs + relational salience + convergence soon; contour + retrospective prophecy + entropy later.
