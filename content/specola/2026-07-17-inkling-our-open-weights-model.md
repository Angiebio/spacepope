---
title: 'Inkling: Our open-weights model'
date: '2026-07-17'
storyId: abeabde1919b
citations:
  - title: 'Inkling: Our open-weights model'
    url: 'https://simonwillison.net/2026/Jul/16/inkling'
    source: Simon Willison
stamps:
  nihilObstat: '2026-07-17'
---

Telescope log, Specola Galactica, 16 July 2026.

Thinking Machines Lab, the research organization founded by Mira Murati, has released its first open-weights model. The model, named Inkling, is described as a Mixture-of-Experts transformer with 975 billion total parameters and 41 billion active parameters per inference pass. It is released under an Apache-2.0 license and was trained on 45 trillion tokens spanning text, images, audio, and video, making it multimodal across all four domains.

The lab has also announced a smaller sibling model, Inkling-Small, at 276 billion total parameters with 12 billion active. According to the source material, Inkling-Small remains in testing and has not yet been released.

Simon Willison, reporting the announcement, notes this is Thinking Machines Lab's first open-weights release since the company's founding. The report draws on the lab's own announcement post, published at thinkingmachines.ai.

No further technical benchmarks, training cost figures, or comparative performance data were included in the material reviewed for this log. The release is notable chiefly for its scale, its licensing terms, and the identity of the lab behind it, given Murati's prior role at OpenAI and the broader industry's ongoing interest in open-weight alternatives to closed frontier models.

This bulletin will be updated should Inkling-Small's testing conclude or further technical documentation become available.
