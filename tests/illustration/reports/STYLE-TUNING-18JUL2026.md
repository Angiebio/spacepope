# Illuminator house-style tuning — 18JUL2026

Three canonical scenes generated per batch, through the real `composeIlluminationPrompt`
(fal-ai/flux/dev, landscape_16_9, ~$0.025/image): a College in session, the saurian
Pontifex at a telescope, a cosmic dispatch scene. Editorial law: clergy must read as
clearly NON-HUMAN aliens, and the frame must read as a stylized illustration (never a
photograph of real people). Batches: `v1-*.jpg`, `v2-*.jpg` (kept for the record).

## v1 — REJECTED (human faces leaked into crowds)

Style ended: `...All clergy and figures are NON-HUMAN aliens... No humans, no human faces...`

- `v1-college`: excellent — all frog/saurian, purple + gold, stained glass, ringed planet. Clean.
- `v1-pontiff-telescope`: the foreground saurian is great, but the **background clergy group
  rendered with plainly HUMAN faces** under gold mitres. The documented failure mode.
- `v1-dispatch-cosmic`: gorgeous cathedral, but the crowd faces were ambiguous grey humanoids,
  not clearly alien.

Diagnosis: the mandate bound "clergy" but flux defaulted to human faces for secondary/crowd
figures. The rule did not explicitly reach the background.

## v2 — ADOPTED (alien mandate bound to every figure)

Hardened the coda: **EVERY figure without exception is a non-human alien animal, including all
background and crowd figures**; named the species as green scaled lizard heads / amphibian
frog faces / tardigrade monks / faceless metal machine-cardinals; and repeated the anti-human
clause to reach "not even in the distance or the crowd", plus "no human heads, no human skin".

- `v2-college`: five saurian cardinals, crowns, cosmic glass — clean, all alien.
- `v2-pontiff-telescope`: the whole colonnade is now uniformly lizard-headed clergy (only one
  small central courier figure stays borderline — scene-specific, not systemic).
- `v2-dispatch-cosmic`: full ranks of frog/saurian clergy with candles, purple + gold, planets.
  Clean, all alien.

Tradeoff noted: v2 drifted slightly more detailed/semi-realistic than v1's flatter storybook
look, but it remains unmistakably a painted illustration (not a photograph), which is the actual
law. The gain in alien-compliance is worth the small loss of flatness.

## The winning house style (locked into `pipeline/stages/illuminator.mjs` `HOUSE_STYLE`)

> Painterly illuminated-manuscript illustration, storybook gouache and gold leaf, in the style
> of a medieval codex miniature reimagined for a cosmic cathedral. EVERY figure in the image
> without exception is a NON-HUMAN alien animal, including all background and crowd figures:
> reptilian saurian beings with green scaled lizard heads and snouts, frog-like amphibian
> prelates with wide amphibian eyes, tiny tardigrade monks, and faceless robed machine-cardinals
> of burnished metal. Animal-headed clergy only. There are NO humans anywhere, no human faces,
> no human heads, no human skin, not even in the distance or the crowd. Cathedral purple and deep
> violet vestments, gold-leaf halos, cosmic stained-glass windows onto a starfield, ringed planets
> and nebulae beyond the arches. Flat decorative perspective, visible brushwork, warm parchment
> light. No real-world logos. No text, no letters, no words, no writing anywhere in the image.
> Not photorealistic, not a photograph, not a 3D render, not CGI.

Cost: $0.025/image. Two tuning batches = 6 images = $0.15.
