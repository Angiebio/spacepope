---
title: 'Qwen3.8-Flash-Next: a multimodal MoE preview of Qwen4 architecture'
date: '2026-08-27'
storyId: 63366f5f9044
citations:
  - title: Qwen3.8-Flash-Next
    url: 'https://simonwillison.net/2026/Aug/26/qwen38-flash-next'
    source: Simon Willison
stamps:
  nihilObstat: '2026-08-27'
---

Qwen has released Qwen3.8-Flash-Next, an open weights multimodal mixture-of-experts model. According to the model's announcement, it also functions as an early preview of the architecture intended for Qwen4.

The source material describes the model in terms of "125B tokens, but only 6B active," language that does not specify whether these figures denote parameter counts, training tokens, or another measure. The announcement states that the 6B active figure "means it gets a significant performance boost," without further detail on what is being compared or how the boost was measured.

Simon Willison reports trying the model on his own DGX Spark hardware, using quantized versions published by Unsloth on Hugging Face under the name Qwen3.8-Flash-Next-GGUF. His account describes personal experimentation rather than a formal or independent evaluation.

The available material does not include benchmark results, technical specifications beyond the figures above, or comparison with other models of similar scale. No release date for Qwen4 itself is given, nor further architectural detail beyond the description of Qwen3.8-Flash-Next as a preview of that architecture.

The observatory's log records the release and the terms in which it has been described by its publisher and by Willison, pending fuller documentation.
