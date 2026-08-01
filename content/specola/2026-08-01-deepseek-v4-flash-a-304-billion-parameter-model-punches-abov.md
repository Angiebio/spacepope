---
title: >-
  DeepSeek V4 Flash, a 304-billion-parameter model, punches above its weight on
  agentic tasks
date: '2026-08-01'
storyId: 2a97a806a43b
citations:
  - title: deepseek-ai/DeepSeek-V4-Flash-0731
    url: 'https://simonwillison.net/2026/Jul/31/deepseek-v4-flash-0731'
    source: Simon Willison
stamps:
  nihilObstat: '2026-08-01'
---

DeepSeek AI has released DeepSeek-V4-Flash-0731, the latest entry in its V4 model family, publishing the weights on Hugging Face. The release notes describe "substantially enhanced agentic capabilities" compared to prior versions in the line.

The model contains 304 billion parameters and occupies 167GB on Hugging Face. Despite this relatively modest size by current frontier standards, independent benchmarking firm Artificial Analysis ranks it ahead of MiniMax M3, a 428-billion-parameter model, on their evaluation suite.

Pricing for the model runs at $0.14 per million tokens, according to the source material, positioning it as substantially cheaper than many comparably capable systems.

Commentator Simon Willison, writing on his blog on July 31st, flagged the release as notable chiefly for this performance-to-size ratio: a smaller model outperforming a larger competitor on agentic benchmarks. Willison's post situates the release within the broader pattern of open-weight models from Chinese AI labs continuing to close the gap with, or in some benchmarks exceed, proprietary systems from Western firms.

No further technical documentation, training details, or architecture specifics were included in the available summary beyond the parameter count, file size, and benchmark ranking cited above. The Hugging Face model card is listed as the primary source for the release itself, with Artificial Analysis credited for the comparative ranking against MiniMax M3.
