---
title: Discovering cryptographic weaknesses with Claude
date: '2026-07-29'
storyId: 019b9ac466bc
citations:
  - title: Discovering cryptographic weaknesses with Claude
    url: >-
      https://simonwillison.net/2026/Jul/28/discovering-cryptographic-weaknesses-with-claude
    source: Simon Willison
stamps:
  nihilObstat: '2026-07-29'
---

Bulletin. Specola Galactica, telescope log.

Anthropic researchers have published an account of using their Claude model, internally designated Claude Mythos, to search for mathematical weaknesses in cryptographic algorithms. The work, reported by Simon Willison on July 28 and drawn from Anthropic's own research page and an accompanying GitHub repository, describes flaws found in two systems, HAWK and a deliberately weakened variant of AES.

Anthropic states plainly that "neither of these results has a practical impact on today's computer systems," meaning the vulnerabilities identified do not threaten currently deployed encryption. The significance the researchers draw is methodological rather than immediate, an indication that a large language model can be directed toward genuine mathematical cryptanalysis and produce findings of research interest.

Willison's post highlights the prompts used to guide the model through this analysis as a notable feature of the published material, alongside the technical results themselves. The repository accompanying the research paper allows outside readers to examine the model's process directly.

The published account frames this as an early demonstration of AI-assisted cryptographic research rather than a finished or field-ready technique. No claim is made in the source material that the approach has been applied beyond these two test cases, and no timeline for further application is given.
