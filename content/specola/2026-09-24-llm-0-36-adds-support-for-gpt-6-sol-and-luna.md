---
title: LLM 0.36 adds support for GPT-6 Sol and Luna
date: '2026-09-24'
storyId: 1b1371e9ec40
citations:
  - title: llm 0.36
    url: 'https://simonwillison.net/2026/Sep/22/llm'
    source: Simon Willison
stamps:
  nihilObstat: '2026-09-24'
---

Simon Willison released version 0.36 of his command-line tool LLM, adding support for two new OpenAI models. The release notes, published on GitHub, list new model identifiers `gpt-6-sol` for GPT-6 Sol and `gpt-6-luna` for GPT-6 Luna, both now documented on OpenAI's developer site. The addition is tracked under issue #1702 in the project's repository.

The release notes indicate a second change alongside the new model support, describing an update that allows model plugins to declare additional capabilities, though the provided documentation excerpt cuts off before detailing the full scope of that feature.

LLM is Willison's open-source utility for accessing large language models from the command line and via Python, and it is updated frequently to track new model releases across providers. This release continues that pattern, extending compatibility to OpenAI's newly published GPT-6 Sol and GPT-6 Luna models on the day their documentation went live.

The release is documented at github.com/simonw/llm/releases/tag/0.36, with the underlying model pages hosted at developers.openai.com. No further technical specifications, pricing, or capability comparisons for GPT-6 Sol or GPT-6 Luna were included in the portion of the release notes provided.
