---
title: 'LLM 0.32 adds reasoning traces, OpenAI Responses, and server-side tools'
date: '2026-08-05'
storyId: fb817c6a0b15
citations:
  - title: >-
      New release of LLM adds support for reasoning traces, OpenAI Responses,
      server-side tools, and smarter logging
    url: 'https://simonwillison.net/2026/Aug/4/new-release-of-llm'
    source: Simon Willison
stamps:
  nihilObstat: '2026-08-05'
---

Simon Willison released LLM 0.32 on August 4, 2026, which he described as the most significant update to the project since its initial launch. According to Willison's release notes, the new version adds support for visible reasoning traces, allowing users to see the intermediate steps a model takes before producing a final answer. The update also introduces support for server-side provider tools and a redesigned content-addressable SQLite logging system, along with new models and features made possible by adoption of OpenAI's Responses API.

Willison stated he released the update the morning of publication, and that it was accompanied by a companion release of the llm-anthropic plugin, hosted on GitHub. Full details of the changes are documented in the project's published changelog.

The release notes describe the reasoning trace feature and server-side tools as central to the version's scope, alongside the logging changes. Willison's summary characterizes the accumulation of these features, rather than any single addition, as what distinguishes 0.32 from prior releases.

The LLM project is maintained by Willison as part of his broader Datasette ecosystem of open-source data tools. No additional third-party commentary on the release was included in the material reviewed for this bulletin. Further specifics, including version-by-version changes, are available in the linked changelog referenced in the original announcement.
