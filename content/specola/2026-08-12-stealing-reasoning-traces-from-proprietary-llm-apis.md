---
title: Stealing reasoning traces from proprietary LLM APIs
date: '2026-08-12'
storyId: 9098acb81a29
citations:
  - title: Stealing Reasoning Traces from Proprietary LLM APIs
    url: 'https://simonwillison.net/2026/Aug/11/stealing-reasoning-traces'
    source: Simon Willison
stamps:
  nihilObstat: '2026-08-12'
---

Telescope log, August 11. A paper circulated under the domain stolen-thoughts.com, flagged by Simon Willison, describes a technique for extracting reasoning traces from proprietary large language model APIs.

According to the paper's abstract, Anthropic, OpenAI, and Google each return encrypted chain-of-thought blocks to API clients. The researchers report that these blocks can be replayed across different sessions, different users, and even different models. The abstract states that the authors took a trace produced by a frontier model and replayed it into a smaller, weaker sibling model, using the borrowed reasoning to jailbreak the weaker system. The full text of the paper was not included in the material reviewed here; this summary rests on the abstract as quoted by Willison.

Willison's post frames the paper as "neat," noting the deliberately provocative domain name chosen for its promotion. No further technical detail, methodology, or response from the named companies was available in the source material.

The finding, if borne out under wider scrutiny, would touch on how frontier AI providers secure the internal reasoning they return alongside API outputs, and whether encryption of that reasoning is sufficient to prevent it from being captured and reused outside its original context. The paper was posted to alphaXiv on August 9, per the linked reference.

No comment from Anthropic, OpenAI, or Google appears in the material reviewed.
