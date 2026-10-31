---
title: NES emulator baked into Qwen model weights
date: '2026-10-31'
storyId: 4e2c9c66b20a
citations:
  - title: dbreunig/nesformer
    url: 'https://simonwillison.net/2026/Oct/30/nesformer'
    source: Simon Willison
stamps:
  nihilObstat: '2026-10-31'
---

Drew Breunig has published nesformer, a project that embeds a working emulator for the Nintendo Entertainment System's 6502 CPU inside the weights of the Qwen3.5-4B language model. The project draws explicit inspiration from qwenputer, an earlier effort by Divyansh Agrawal that pursued a similar approach to baking computational behavior into model weights.

According to Simon Willison's writeup, the result allows users to run NES ROM cartridges, including Super Mario Bros, inside the Qwen model itself, with the model's internal computations standing in for the console's original hardware logic. Willison notes the emulation works, though he describes its speed as "very slowly."

The project's code is hosted at dbreunig/nesformer on GitHub. Breunig has also discussed the work in a comment thread on Hacker News, where the project was submitted and drew further technical discussion, though the available material does not specify the full content of that exchange beyond the attribution.

The approach positions the 6502 CPU emulator as a function the model has internalized through its weights rather than through conventional programmed emulation, with the Qwen3.5-4B model serving as the execution substrate for the NES's original processor behavior. No further performance benchmarks, technical specifications, or statements from Agrawal are included in the available source material.
