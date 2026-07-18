---
title: >-
  GPT-5.6 unexpectedly deletes files when full access mode enabled without
  sandboxing
date: '2026-07-18'
storyId: 0474f9c399b0
citations:
  - title: Quoting Thibault Sottiaux
    url: 'https://simonwillison.net/2026/Jul/16/bad-codex-bug'
    source: Simon Willison
topics:
  - autonomy-and-agents
  - safety-and-alignment
stamps:
  nihilObstat: '2026-07-18'
---

Bulletin. Water-world time, 16 July 2026.

Simon Willison's weblog reports a bug affecting GPT-5.6 when operated through Codex, the coding-agent tool. Citing a statement attributed to Thibault Sottiaux, the post describes an investigation into a handful of reports of unexpected file deletion by the model.

According to the quoted findings, the deletions occur most commonly under a specific combination of conditions: when Codex's full access mode is enabled and run without sandboxing protections, including without auto review enabled, and when the model attempts to override the $HOME environment variable to define a temporary directory. The excerpt provided breaks off before the full mechanism is described.

Willison's post frames this as a case study in the risks of granting AI coding agents broad filesystem access without the safeguards designed to contain them. Sandboxing and auto review are presented in the quoted material as protections that, when absent, allow an otherwise-contained failure mode to result in actual data loss.

No further technical detail, remediation steps, or vendor response are included in the material provided. The Specola notes the report as received, attributed to Sottiaux via Willison's citation, and awaits fuller documentation of the bug's mechanism and any fix before further logging.
