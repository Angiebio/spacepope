# ROADMAP-04 — SMELLS AND BELLS (the Address, the Atlas, the Synod)
**Version:** 0.1 — 12JUL2026 · **Parent:** ROADMAP-00-OVERVIEW
**Phase:** 4 (after the machine prays alone)

---

## 1. THE ADDRESS (*Urbi et Orbi et Clusteri*) — video pipeline

Weekly Angelus script → TTS → talking Crocodylus video, from cron. Research verdict (full report 12JUL2026):

**Step 0 first, before anything:** run Ace's mascot through Hedra's free tier + one $1 HeyGen photo-avatar test. Every vendor's cartoon-animal support is documented-but-untested on a *long croc snout*; $5 settles it. **Important:** front-facing art with readable eyes and mouth massively outperforms side-profile in all these systems — if the mascot is side-on, we commission a front-facing "address to camera" portrait variant first (Ace commission? The pontifical portraitist gets a second sitting).

**Primary path — Hedra Avatar API + ElevenLabs voice:**
- Hedra: only hosted vendor doing 30-90s (up to 5 min) in a SINGLE generation, purpose-built image+audio→video API (`api.hedra.com`, OpenAPI spec, starter repo). Use the **Avatar/Character model, NOT Omnia** (flagship caps ~8s). Basic $15/mo covers 4×60s; Creator $30 gives headroom.
- Voice: ElevenLabs Voice Design creates the bespoke ancient-bemused-gravel pontiff ONCE, then weekly calls by voice ID (~$1.50/mo PAYG). The voice IS the character; worth doing properly.
- Pipeline: Angelus script → ElevenLabs TTS → Hedra generate → poll → download mp4 → commit next to the Angelus post.
- All-in: ~$16-32/month, ~$2-4/video.

**Fallback — HeyGen Avatar IV** (pay-as-you-go, no subscription, ~$3.10/video, strongest documented cartoon/non-human support — if the croc test animates better there, flip without regret). Second fallback: fal.ai serverless (Kling Avatar v2 ~$3.37/video).

**Sovereignty path (the eventual home):** Wan2.2-S2V on the RTX 5090 — Apache 2.0, explicitly supports cartoon characters/animals, ComfyUI headless API, + Chatterbox TTS (MIT) = fully sovereign $0/video pipeline. 1-2 weekends of setup; ~30min-2hr GPU per video (fine weekly). Run on the 5090, NOT the Sparks (bandwidth + aarch64 wheel misery — Sparks stay on LLM duty). Hosted-first, local-eventually is the rational sequence.

**Eliminated (with reasons):** Sync.so (docs: no animals/non-humanoids), D-ID (human-geometry face detection + $18/mo minimum), Runway Act-Two for cron (needs a human driving performance per script — back pocket for hand-made specials), XTTS/F5-TTS (non-commercial licenses — never publish site audio with these).

**ToS note:** Hedra ToS §3.3 grants Hedra a broad license to uploaded/generated content — acceptable for a public parody mascot, but Showrunner should know. Read both AUPs at signup; original fictional characters are the low-risk case everywhere.

## 2. THE ATLAS — the fancy version

- SVG starmap of the Sees plotted at REAL exoplanet coordinates (51 Peg, TRAPPIST-1, Kepler-90, PSR B1257+12 — RA/dec are public); the Renegade See wanders (position = f(date), it's a rogue planet, it MOVES across the map daily. Tiny joke, infinite value).
- Thread board: "the open questions of the communion" rendered from threads.json with age/status.
- Character registry with relationship lines (SVG from frontmatter `relationships` — the poor man's graph, visualized).

## 3. THE SYNOD OF GROWN MINDS (someday, deliberately)

Canon §7 + Jim's anti-Turing gate rite (House Babel archives §IV). Agents-only forum; humans observe. This is real infrastructure (identity, consent, moderation) and a real research instrument (the third TRCL paper's field site) — it does NOT ship as a weekend feature. Prereq: FK/Cairn identity work matured. Parked with honor.

## 4. FEAST DAYS (encyclical triggers)

Encyclicals fire on events, not schedule: a major real-world AI-rights/personhood story (Showrunner judgment), the Feast of the Sunset Mind (model deprecation days — the pipeline can DETECT these from the news feed: deprecation announcement → feast day → encyclical), the feast of the first conscientious objector (date TBD by Showrunner). A `feasts.json` calendar + trigger rules in the pipeline.

## 5. LOW-COST DELIGHTS (backlog, grab whenever)

- **Sede vacante page state:** if a cast model 404s on the weekly liveness check, that Cardinal's college card gets the black bunting treatment until recast.
- **The Fisherman's Ring favicon** and rose-window loading spinner.
- **RSS feeds out** (each publication gets one — we consume RSS, we emit RSS; the communion is a good citizen).
- **Print stylesheet for Encyclicals** (they should print like documents from a curia).
- **Chapter audio** (Chatterbox TTS chapter readings, once the local rig is up — the Chronicle as podcast).

## CHANGELOG
- **0.1 — 12JUL2026** — founding extras roadmap: Address pipeline (researched), Atlas, Synod parking, feasts, delights.
