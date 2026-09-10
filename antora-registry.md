---
name: "Page context"
description: "Render audience, usage, authorship, rights, and related page-* metadata as lead/footer asides plus HTML meta."
---

# Overview

Dev-Centr (and similar) docs need a stable way to declare **who a page is for**, **what kind of page it is**, and **who wrote it**, without hand-duplicating labeled lists.

This Asciidoctor extension (register under Antora `asciidoc.extensions`) reads a large `page-*` attribute catalog — oriented toward Dublin Core, Quarto/SSG front matter, AsciiDoc revision fields, and Diátaxis — and injects:

- A **lead** aside (audience, usage, authorship, dates, status, …)
- A **footer** aside (license, identifiers, locale, see-also — colophon only)
- Matching **HTML `<meta>`** tags (`dcterms.*`, `og:*`, `article:*`, `citation_*`, …)

Agent-assisted authorship uses `{product} on behalf of {human}` (display: `{human} [avatar] via {product}`).

## Install

```bash
pnpm add -D github:antora-supplemental/page-context#main
```

## Playbook

```yaml
asciidoc:
  extensions:
    - '@antora-supplemental/page-context'
```

## Minimal header

```asciidoc
= Page title
:page-audience: New org members adopting the stack
:page-usage-context: Full teaching page on the docs hub
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-08-25
```

Full catalog: see the repository README.

## Links

- Repository: https://github.com/antora-supplemental/page-context
- Policy (Dev-Centr): `general/documentation.md` in [dev-centr/agent-rules](https://github.com/dev-centr/agent-rules)
