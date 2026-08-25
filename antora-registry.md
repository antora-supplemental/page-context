---
name: "Page context"
description: "Render Audience, Usage context, and original/latest author credits from page-* attributes."
---

# Overview

Dev-Centr (and similar) docs need a stable way to declare **who a page is for** and **who wrote it**, without hand-duplicating labeled lists on every page.

This Asciidoctor extension (register under Antora `asciidoc.extensions`) reads document attributes and injects:

- A **lead** aside from `page-audience` / `page-usage-context`
- A **footer** aside from `page-orig-author` / `page-last-author` (optional `page-last-edited`)

Agent-assisted authorship uses the string shape `{product} on behalf of {human}` (for example `Cursor agent on behalf of Ryan Johnson`).

## Install

```bash
pnpm add -D github:antora-supplemental/page-context#main
# or, after npm publish: pnpm add -D @antora-supplemental/page-context
```

## Playbook

```yaml
asciidoc:
  extensions:
    - '@antora-supplemental/page-context'
```

## Page header schema

```asciidoc
= Page title
:page-audience: New org members adopting the stack
:page-usage-context: Full teaching page on the docs hub
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-08-25
```

Do **not** also paste hand-written `Audience::` / author labeled lists when this extension is active.

## Links

- Repository: https://github.com/antora-supplemental/page-context
- Policy (Dev-Centr): `general/documentation.md` in [dev-centr/agent-rules](https://github.com/dev-centr/agent-rules)
