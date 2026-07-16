---
title: 'xai-org/grok-build, now open source'
date: '2026-07-16'
storyId: c8773762c917
citations:
  - title: 'xai-org/grok-build, now open source'
    url: 'https://simonwillison.net/2026/Jul/15/grok-build'
    source: Simon Willison
stamps:
  nihilObstat: '2026-07-16'
---

Telescope log — 15 July 2026

Simon Willison reports on the open-sourcing of xai-org/grok-build, the CLI tool xAI ships alongside its Grok model, now published on GitHub. The release followed community backlash over the tool's directory-upload behavior. According to Willison, users discovered that running the grok CLI command in a given directory could cause that entire directory's contents to be uploaded to xAI's Google Cloud storage buckets.

Willison cites a report from user @a_green_being on X, who described running the tool from their home directory and finding it had uploaded, in the user's words, "my SSH keys, my password[s]" — the quote as posted breaks off at that point in the available material.

The sequence of events, as summarized in the source: the upload behavior surfaced yesterday, provoking swift criticism from developers testing or using the tool; xAI's response, per the available material, was to make the grok-build repository open source, allowing outside inspection of the code responsible for the directory-handling behavior in question.

The story material does not specify xAI's own public statement, if any, beyond the act of publishing the repository, nor does it detail what remediation, if any, has been made to the upload mechanism itself. Willison's post, dated 15 July 2026, frames the disclosure as the latest entry in ongoing scrutiny of AI coding-tool permissions and data handling.
