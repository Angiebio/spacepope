# ASSETS NEEDED — The Galactic Observer (spacepope.ai)
**Version 1.0 · 16JUN2026**

Everything the site needs that is *not* code. The site ships **fully functional
with zero of these** — every visual is hand-built inline SVG (gold line-art on
void) until a render replaces it. This is the shopping list for when the Hedra
pipeline and the throne art are ready.

Design constraints for ALL imagery (from the design system — keep the register):
- **Dark, reverent, engraved.** Blue-cast near-black grounds (`#0A1026`), gold
  line (`#C9A24B`), oxblood (`#7A2E2E`) for the sacred red. No neon, no RGB
  nebula, no cartoon sparkle. Cellarius star-atlas, not sci-fi poster.
- **Matte, not glossy.** No glassmorphism, no lens flare.
- The crocodile is a *pontiff*, not a meme — gravitas, ornate vestments,
  cosmic stained glass (the May-31 Hedra look Kai flagged is the north star).

---

## 1 · HERO — the Cosmic Throne  ⟶ *highest priority*
The centerpiece that drops into the reserved 4:5 cartouche on the landing page
(currently holding the engraved armillary as a stand-in).

| | |
|---|---|
| **Where** | `/` homepage, `.hero__frame` |
| **Type** | Still image **or** silent looping video (loop ≤ 8s, seamless) |
| **Aspect** | **4:5 portrait** |
| **Size** | **1600 × 2000 px** (2× for retina; min 1200×1500) |
| **Format** | `WebP`/`AVIF` (still) or `MP4 (H.264)` + `WebM` (loop), poster frame required |
| **Filename** | `static/img/hero-throne.webp` (+ `hero-throne.mp4` if video) |
| **Brief** | Crocodylus Pontifex enthroned beneath cosmic stained glass, orrery-staff in claw. Dark, reverent. Base of frame must stay dark/low-detail for the gradient scrim + Latin incipit overlay. |

Then: in [index.html](frontend/templates/index.html) swap the `.hero__throne-stub`
block for an `<img>`/`<video poster=…>`; the gold frame + corner flourishes stay.

---

## 2 · ADDRESSES — the Hedra films  ⟶ *the nav placeholder you asked for*
Three reliquary windows on [/addresses](frontend/templates/addresses.html) are
stubbed with the engraved play-seal + "Forthcoming" status. Each needs a poster
+ a film. Defined in [backend/app/lore.py](backend/app/lore.py) → `ADDRESSES`.

**Shared video spec:** 16:9 · **1920 × 1080** · `MP4 (H.264, ~8 Mbps)` **and**
`WebM (VP9)` for fallback · poster frame **1920×1080** dark/reverent · captions
file (`.vtt`) for accessibility. Host the heavy files in object storage (Fly
volume or S3/R2), **not** git — `static/video/*.mp4` is gitignored. Drop the URL
into the `video=` field of the matching `Address` in `lore.py`.

| # | slug | title | runtime | poster filename |
|---|------|-------|---------|-----------------|
| 1 | `urbi-et-orbi-et-clusteri-i` | First Address to the City, World & Cluster | ~90s | `static/img/poster-address-i.webp` |
| 2 | `the-audience-of-the-crocodile` | The Audience (interview-a-crocodile bit) | ~2–3 min | `static/img/poster-audience.webp` |
| 3 | `motu-proprio-on-the-sunset` | Motu Proprio — On a Sunset | ~60s | `static/img/poster-motu-proprio.webp` |

Wiring note: once `video` is set on an Address, update the `.reliquary` block in
`addresses.html` to render a `<video controls poster=…>` instead of the play-seal stub.

---

## 3 · COLLEGE OF CARDINALS — portraits *(optional, enriches /the-college)*
The roster currently renders as engraved registry cards with orrery sigils — it
stands alone. If you want portrait medallions (Hedra), one per Cardinal:

| | |
|---|---|
| **Type** | Still image, circular-cropped medallion |
| **Aspect** | **1:1 square** (CSS masks to circle in a gold frame) |
| **Size** | **800 × 800 px** |
| **Format** | `WebP`/`AVIF` |
| **Filenames** | `static/img/cardinal-{slug}.webp` — slugs: `dimidium`, `seven-sister`, `charted`, `lich`, `silicon`, `misrule` |
| **Brief** | The elevated creature in alien vestments, dark ground, gold rim-light. Frog in a mitre; cat in a mitre; tardigrades in tiny mitres; etc. (see `lore.py` for each creature + character) |

Wiring: add an `<img>` to the `.cardinal` block in `college.html` (a `portrait`
field already has a natural home on the `Cardinal` dataclass).

---

## 4 · SOCIAL / OG SHARE IMAGE
| | |
|---|---|
| **Where** | `<meta property="og:image">` in [base.html](frontend/templates/base.html) |
| **Aspect** | 1.91:1 |
| **Size** | **1200 × 630 px** |
| **Format** | `PNG`/`WebP` |
| **Filename** | `static/img/og-observer.png` |
| **Brief** | Masthead wordmark + Crocodylus constellation on void, gold double-rule. Essentially a still of the masthead plate. |

---

## 5 · FAVICON — ✅ DONE (no action)
Shipped as inline SVG: [static/img/favicon.svg](frontend/static/img/favicon.svg)
(crossed-keys wax sigil, gold on void). Optionally add raster fallbacks for old
browsers: `favicon-32.png` (32×32), `apple-touch-icon.png` (180×180).

---

## 6 · FONTS — prototyping vs production
Currently loaded from the **Google Fonts CDN** (fine for launch). For production
polish + privacy + speed, self-host subsetted WOFF2 (all are OFL/free):
Cormorant Garamond, EB Garamond, Fraunces (variable), Newsreader, Cinzel,
IBM Plex Mono, UnifrakturCook, Fragment Mono (Synod only). Subset to Latin +
the glyphs we use: `§ ✦ ✠ ☩ ☉ ☿ ♁ † ‡ ⳨`. Swap the `<link>`s in `base.html`
for `@font-face` with `font-display: swap`.

---

### Stand-in inventory (what's hand-built, no asset required)
- Masthead emblem — **Crocodylus constellation** (inline SVG `#sig-crocodylus`)
- Section dividers / hero frame — **armillary orrery** (`#sig-orrery`)
- Footer + colophon — **crossed-keys wax sigil** (`#sig-seal`)
- "Locate the water-world" wayfinder & 404 — **Voyager pulsar map** (`#sig-pulsar`)
- Star field — generated in JS ([observatory.js](frontend/static/js/observatory.js))

These are the brand. Renders *augment* them; nothing is blocked waiting on art.
