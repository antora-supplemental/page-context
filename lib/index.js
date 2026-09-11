'use strict'

/**
 * Render page-context metadata from AsciiDoc `page-*` attributes.
 *
 * Schema lives in SCHEMA (lead / footer / html-meta). Only set attributes
 * render. House-required subset (Dev-Centr): audience, orig-author, last-author.
 * Teaching pages: byline (Last updated … by …) + slim lead table (orientation).
 * Component homes suppress audience/usage chrome and put authorship in the footer.
 *
 * Agent-assisted authorship display: "{human} via {product}"
 * (parses legacy "{product} on behalf of {human}" and "{human} (via {product})").
 */

const LEAD_ROLE = 'page-context-lead'
const FOOTER_ROLE = 'page-context-footer'
const SCHEMA_VERSION = '0.6.6'

/** Orientation attrs never rendered on component home surfaces (attrs may still exist for agents / HTML meta). */
const COMPONENT_HOME_SUPPRESS = new Set(['page-audience', 'page-usage-context'])

/** Authorship / dates / revision — moved to footer on component home surfaces. */
const COMPONENT_HOME_FOOTER_ATTRS = new Set([
  'page-orig-author',
  'page-author',
  'page-authors',
  'page-creator',
  'page-last-author',
  'page-last-modified-by',
  'page-contributors',
  'page-editor',
  'page-reviewer',
  'page-reviewers',
  'page-translator',
  'page-maintainer',
  'page-owner',
  'page-created',
  'page-date-created',
  'page-published',
  'page-date-published',
  'page-date',
  'page-last-edited',
  'page-last-modified',
  'page-revised',
  'page-revdate',
  'page-revision',
  'page-revnumber',
  'page-version',
  'page-edition',
])

/** Built-in display-name → GitHub login (no API). Override via attrs or page-context-authors. */
const DEFAULT_AUTHOR_GITHUB = Object.freeze({
  'Ryan Johnson': 'AMDphreak',
})

/**
 * @typedef {{ attr: string, label: string, section: 'lead'|'footer', aliasOf?: string, html?: boolean }} Field
 */

/** @type {Field[]} */
const SCHEMA = [
  // --- Orientation (lead) — Diátaxis / SSG / Dublin Core audience ---
  { attr: 'page-audience', label: 'Audience role', section: 'lead' },
  { attr: 'page-usage-context', label: 'Usage context', section: 'lead' },
  { attr: 'page-role', label: 'Role', section: 'lead' },
  { attr: 'page-level', label: 'Level', section: 'lead' },
  { attr: 'page-difficulty', label: 'Level', section: 'lead', aliasOf: 'page-level' },
  { attr: 'page-prerequisites', label: 'Prerequisites', section: 'lead' },
  { attr: 'page-requires', label: 'Prerequisites', section: 'lead', aliasOf: 'page-prerequisites' },
  { attr: 'page-abstract', label: 'Abstract', section: 'lead' },
  { attr: 'page-summary', label: 'Abstract', section: 'lead', aliasOf: 'page-abstract' },
  { attr: 'page-tl-dr', label: 'TL;DR', section: 'lead' },
  { attr: 'page-reading-time', label: 'Reading time', section: 'lead' },
  { attr: 'page-estimated-time', label: 'Estimated time', section: 'lead' },
  { attr: 'page-duration', label: 'Estimated time', section: 'lead', aliasOf: 'page-estimated-time' },

  // --- Lifecycle / status (lead) ---
  { attr: 'page-status', label: 'Status', section: 'lead' },
  { attr: 'page-maturity', label: 'Maturity', section: 'lead' },
  { attr: 'page-stability', label: 'Stability', section: 'lead' },
  { attr: 'page-lifecycle', label: 'Lifecycle', section: 'lead' },
  { attr: 'page-content-status', label: 'Status', section: 'lead', aliasOf: 'page-status' },
  { attr: 'page-draft', label: 'Draft', section: 'lead' },
  { attr: 'page-deprecated', label: 'Deprecated', section: 'lead' },
  { attr: 'page-replaced-by', label: 'Replaced by', section: 'lead' },
  { attr: 'page-supersedes', label: 'Supersedes', section: 'lead' },
  { attr: 'page-expires', label: 'Expires', section: 'lead' },
  { attr: 'page-valid-until', label: 'Expires', section: 'lead', aliasOf: 'page-expires' },

  // --- Classification (footer) ---
  { attr: 'page-doc-type', label: 'Document type', section: 'footer' },
  { attr: 'page-type', label: 'Document type', section: 'footer', aliasOf: 'page-doc-type' },
  { attr: 'page-diataxis', label: 'Diátaxis', section: 'footer' },
  { attr: 'page-keywords', label: 'Keywords', section: 'footer' },
  { attr: 'page-tags', label: 'Tags', section: 'footer' },
  { attr: 'page-category', label: 'Category', section: 'footer' },
  { attr: 'page-categories', label: 'Category', section: 'footer', aliasOf: 'page-category' },
  { attr: 'page-topic', label: 'Topic', section: 'footer' },
  { attr: 'page-subject', label: 'Topic', section: 'footer', aliasOf: 'page-topic' },
  { attr: 'page-series', label: 'Series', section: 'footer' },
  { attr: 'page-collection', label: 'Series', section: 'footer', aliasOf: 'page-series' },
  { attr: 'page-part-of', label: 'Part of', section: 'footer' },

  // --- Authorship / provenance (footer) ---
  { attr: 'page-orig-author', label: 'Original author', section: 'footer', html: true },
  { attr: 'page-author', label: 'Author', section: 'footer', html: true },
  { attr: 'page-authors', label: 'Authors', section: 'footer', html: true },
  { attr: 'page-creator', label: 'Original author', section: 'footer', aliasOf: 'page-orig-author', html: true },
  { attr: 'page-last-author', label: 'Latest contributor', section: 'footer', html: true },
  { attr: 'page-last-modified-by', label: 'Latest contributor', section: 'footer', aliasOf: 'page-last-author', html: true },
  { attr: 'page-contributors', label: 'Contributors', section: 'footer', html: true },
  { attr: 'page-editor', label: 'Editor', section: 'footer', html: true },
  { attr: 'page-reviewer', label: 'Reviewer', section: 'footer', html: true },
  { attr: 'page-reviewers', label: 'Reviewer', section: 'footer', aliasOf: 'page-reviewer', html: true },
  { attr: 'page-translator', label: 'Translator', section: 'footer', html: true },
  { attr: 'page-maintainer', label: 'Maintainer', section: 'footer', html: true },
  { attr: 'page-owner', label: 'Owner', section: 'footer', html: true },

  // --- Dates / revision (footer; teaching byline uses last-edited separately) ---
  { attr: 'page-created', label: 'Created', section: 'footer' },
  { attr: 'page-date-created', label: 'Created', section: 'footer', aliasOf: 'page-created' },
  { attr: 'page-published', label: 'Published', section: 'footer' },
  { attr: 'page-date-published', label: 'Published', section: 'footer', aliasOf: 'page-published' },
  { attr: 'page-date', label: 'Date', section: 'footer' },
  { attr: 'page-last-edited', label: 'Last edited', section: 'footer' },
  { attr: 'page-last-modified', label: 'Last edited', section: 'footer', aliasOf: 'page-last-edited' },
  { attr: 'page-revised', label: 'Revised', section: 'footer' },
  { attr: 'page-revdate', label: 'Revised', section: 'footer', aliasOf: 'page-revised' },
  { attr: 'page-revision', label: 'Revision', section: 'footer' },
  { attr: 'page-revnumber', label: 'Revision', section: 'footer', aliasOf: 'page-revision' },
  { attr: 'page-version', label: 'Doc version', section: 'footer' },
  { attr: 'page-edition', label: 'Edition', section: 'footer' },

  // --- Rights / legal (footer / colophon) ---
  { attr: 'page-license', label: 'License', section: 'footer' },
  { attr: 'page-licence', label: 'License', section: 'footer', aliasOf: 'page-license' },
  { attr: 'page-spdx', label: 'SPDX', section: 'footer' },
  { attr: 'page-copyright', label: 'Copyright', section: 'footer' },
  { attr: 'page-rights', label: 'Rights', section: 'footer' },
  { attr: 'page-attribution', label: 'Attribution', section: 'footer' },
  { attr: 'page-funding', label: 'Funding', section: 'footer' },
  { attr: 'page-sponsor', label: 'Funding', section: 'footer', aliasOf: 'page-funding' },
  { attr: 'page-acknowledgements', label: 'Acknowledgements', section: 'footer' },
  { attr: 'page-contact', label: 'Contact', section: 'footer' },
  { attr: 'page-email', label: 'Email', section: 'footer' },
  { attr: 'page-orcid', label: 'ORCID', section: 'footer' },
  { attr: 'page-affiliation', label: 'Affiliation', section: 'footer' },
  { attr: 'page-organization', label: 'Affiliation', section: 'footer', aliasOf: 'page-affiliation' },

  // --- Locale / coverage (footer) ---
  { attr: 'page-lang', label: 'Language', section: 'footer' },
  { attr: 'page-language', label: 'Language', section: 'footer', aliasOf: 'page-lang' },
  { attr: 'page-locale', label: 'Locale', section: 'footer' },
  { attr: 'page-coverage', label: 'Coverage', section: 'footer' },
  { attr: 'page-region', label: 'Region', section: 'footer' },
  { attr: 'page-geo', label: 'Coverage', section: 'footer', aliasOf: 'page-coverage' },

  // --- Identifiers / relations (footer) ---
  { attr: 'page-id', label: 'Identifier', section: 'footer' },
  { attr: 'page-identifier', label: 'Identifier', section: 'footer', aliasOf: 'page-id' },
  { attr: 'page-doi', label: 'DOI', section: 'footer' },
  { attr: 'page-isbn', label: 'ISBN', section: 'footer' },
  { attr: 'page-issn', label: 'ISSN', section: 'footer' },
  { attr: 'page-url', label: 'URL', section: 'footer' },
  { attr: 'page-canonical', label: 'URL', section: 'footer', aliasOf: 'page-url' },
  { attr: 'page-source', label: 'Source', section: 'footer' },
  { attr: 'page-origin', label: 'Source', section: 'footer', aliasOf: 'page-source' },
  { attr: 'page-see-also', label: 'See also', section: 'footer' },
  { attr: 'page-related', label: 'See also', section: 'footer', aliasOf: 'page-see-also' },
  { attr: 'page-parent', label: 'Parent', section: 'footer' },
  { attr: 'page-next', label: 'Next', section: 'footer' },
  { attr: 'page-prev', label: 'Previous', section: 'footer' },
  { attr: 'page-previous', label: 'Previous', section: 'footer', aliasOf: 'page-prev' },

  // --- Extension meta ---
  { attr: 'page-schema-version', label: 'Schema', section: 'footer' },
]

/** Labels that get author chrome (avatar + link) when a GitHub login is known. */
const AUTHOR_LABELS = new Set([
  'Original author',
  'Author',
  'Authors',
  'Latest contributor',
  'Contributors',
  'Editor',
  'Reviewer',
  'Translator',
  'Maintainer',
  'Owner',
])

/** HTML <meta> mappings (name or property → page-* attr). */
const META_MAP = [
  { name: 'author', attrs: ['page-authors', 'page-author', 'page-orig-author'] },
  { name: 'keywords', attrs: ['page-keywords', 'page-tags'] },
  { name: 'description', attrs: ['page-abstract', 'page-summary'] },
  { name: 'dcterms.audience', attrs: ['page-audience'] },
  { name: 'dcterms.creator', attrs: ['page-orig-author', 'page-creator', 'page-author'] },
  { name: 'dcterms.contributor', attrs: ['page-last-author', 'page-contributors'] },
  { name: 'dcterms.created', attrs: ['page-created', 'page-date-created'] },
  { name: 'dcterms.modified', attrs: ['page-last-edited', 'page-last-modified', 'page-revised'] },
  { name: 'dcterms.date', attrs: ['page-published', 'page-date', 'page-created'] },
  { name: 'dcterms.subject', attrs: ['page-topic', 'page-subject', 'page-keywords'] },
  { name: 'dcterms.language', attrs: ['page-lang', 'page-language'] },
  { name: 'dcterms.rights', attrs: ['page-rights', 'page-license', 'page-copyright'] },
  { name: 'dcterms.license', attrs: ['page-license', 'page-spdx', 'page-licence'] },
  { name: 'dcterms.identifier', attrs: ['page-doi', 'page-id', 'page-identifier'] },
  { name: 'dcterms.source', attrs: ['page-source'] },
  { name: 'dcterms.relation', attrs: ['page-see-also', 'page-related'] },
  { name: 'dcterms.coverage', attrs: ['page-coverage', 'page-region'] },
  { name: 'dcterms.publisher', attrs: ['page-affiliation', 'page-organization'] },
  { name: 'citation_doi', attrs: ['page-doi'] },
  { name: 'citation_author', attrs: ['page-authors', 'page-author', 'page-orig-author'] },
  { name: 'robots', attrs: ['page-robots'] },
  { property: 'og:description', attrs: ['page-abstract', 'page-summary'] },
  { property: 'og:locale', attrs: ['page-locale', 'page-lang'] },
  { property: 'article:author', attrs: ['page-authors', 'page-author', 'page-orig-author'] },
  { property: 'article:tag', attrs: ['page-tags', 'page-keywords'] },
  { property: 'article:published_time', attrs: ['page-published', 'page-created'] },
  { property: 'article:modified_time', attrs: ['page-last-edited', 'page-revised'] },
  { property: 'article:section', attrs: ['page-category', 'page-topic'] },
]

const CSS = `
/* Standalone provenance block — not coupled to Antora/Asciidoctor in-doc TOC.
   Own tokens + selectors so theme .tableblock / zebra rules do not apply.
   Lead: outer aside is seamless; .page-context-panel holds table chrome.
   Footer: aside keeps panel chrome (single zone). Table = rows only. */
.page-context {
  --page-context-fg: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 78%, transparent);
  --page-context-label: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 70%, transparent);
  --page-context-border: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 16%, transparent);
  --page-context-divider: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 12%, transparent);
  --page-context-bg: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 3.5%, var(--adt-elevated, #fff));
}
.page-context-lead,
.page-context-footer,
.doc .page-context-lead,
.doc .page-context-footer {
  display: block;
  box-sizing: border-box;
  margin: 0.85rem 0 1rem;
  /* Match in-doc TOC (.doc .toc) scale; stay dimmer than body copy. */
  font-size: 0.82em;
  line-height: 1.35;
  color: var(--page-context-fg, #6b7380);
}
/* Lead outer zone: part of the document — no panel border/wash. */
.page-context-lead,
.doc .page-context-lead {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  background-image: none;
  box-shadow: none;
}
/* Inner metadata panel (lead table) + footer aside panel. */
.page-context-panel,
.doc .page-context-panel,
.page-context-footer,
.doc .page-context-footer {
  padding: 0.4rem 0.15rem;
  border: 1px solid var(--page-context-border, rgba(90, 98, 112, 0.16));
  border-radius: 2px;
  background: var(--page-context-bg, rgba(90, 98, 112, 0.035));
  background-image: none;
  box-shadow: none;
}
.page-context-footer,
.doc .page-context-footer {
  margin-top: 2.25rem;
  margin-bottom: 1.35rem;
}
.page-context-byline,
.doc .page-context-byline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.45rem;
  margin: 0 0 0.55rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--page-context-fg, #6b7380);
}
.page-context-byline-sep {
  opacity: 0.55;
}
.page-context-source-key,
.doc .page-context-source-key {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}
.page-context-source-key .adt-edit-vcs-svg,
.doc .page-context-source-key .adt-edit-vcs-svg {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  opacity: 0.75;
  vertical-align: middle;
}
.page-context-source-label,
.doc .page-context-source-label {
  font-weight: inherit;
}
/* Name, avatar, and "via {product}" share this cluster in the lead byline
   and footer author cells. Flex gap (not HTML spaces) keeps them apart —
   whitespace between those nodes is collapsed. */
.page-context-author,
.doc .page-context-author,
.page-context-byline .page-context-author,
.doc .page-context-byline .page-context-author,
.page-context-footer .page-context-author,
.doc .page-context-footer .page-context-author,
.doc table.page-context-table td .page-context-author {
  display: inline-flex !important;
  align-items: center;
  column-gap: 0.4rem;
  gap: 0.4rem;
  color: inherit;
  text-decoration: none;
  vertical-align: middle;
}
a.page-context-author-name,
.doc a.page-context-author-name {
  color: inherit;
  text-decoration: none;
}
a.page-context-author-name:hover,
.doc a.page-context-author-name:hover {
  text-decoration: underline;
}
.page-context-avatar-wrap,
.doc .page-context-avatar-wrap {
  display: inline-flex;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 18%, transparent);
}
.page-context-avatar,
.doc .page-context-avatar {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.doc .page-context,
.doc .page-context-table,
.doc .page-context-table th,
.doc .page-context-table td {
  color: var(--page-context-fg, #6b7380);
  font-size: inherit;
  font-weight: 400;
}
.page-context-table,
.doc table.page-context-table {
  width: 100%;
  max-width: 100%;
  margin: 0;
  border-collapse: collapse;
  border-spacing: 0;
  border: none;
  border-radius: 0;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none;
}
.page-context-table th,
.page-context-table td,
.doc table.page-context-table th,
.doc table.page-context-table td,
.doc table.page-context-table > tbody > tr > th,
.doc table.page-context-table > tbody > tr > td {
  padding: 0.35rem 0.9rem;
  border: none;
  border-bottom: 1px solid var(--page-context-divider, rgba(90, 98, 112, 0.16));
  /* vertical-align for long Keywords value cells is deferred pending design call. */
  vertical-align: top;
  text-align: left !important;
  font-weight: 400;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
a.page-context-keyword,
.doc a.page-context-keyword {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}
a.page-context-keyword:hover,
.doc a.page-context-keyword:hover,
a.page-context-keyword:focus-visible,
.doc a.page-context-keyword:focus-visible {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 0.1em;
}
.page-context-table > tbody > tr:last-child > th,
.page-context-table > tbody > tr:last-child > td,
.doc table.page-context-table > tbody > tr:last-child > th,
.doc table.page-context-table > tbody > tr:last-child > td {
  border-bottom: none;
}
.page-context-table th,
.doc table.page-context-table th,
.doc table.page-context-table > tbody > tr > th {
  width: 1%;
  white-space: nowrap;
  font-weight: 500;
  color: var(--page-context-label, inherit);
  text-align: left !important;
}
/* Kill theme/Default UI zebra (e.g. html.dark-theme table tbody tr:nth-child(even)). */
.page-context-table > tbody > tr,
.page-context-table > tbody > tr:nth-child(odd),
.page-context-table > tbody > tr:nth-child(even),
.page-context-table > tbody > tr:hover,
.doc table.page-context-table > tbody > tr,
.doc table.page-context-table > tbody > tr:nth-child(odd),
.doc table.page-context-table > tbody > tr:nth-child(even),
.doc table.page-context-table > tbody > tr:hover,
html.dark-theme .page-context-table > tbody > tr,
html.dark-theme .page-context-table > tbody > tr:nth-child(even),
html.dark-theme .page-context-table > tbody > tr:nth-child(odd),
html.dark-theme .doc table.page-context-table > tbody > tr,
html.dark-theme .doc table.page-context-table > tbody > tr:nth-child(even),
html.dark-theme .doc table.page-context-table > tbody > tr:nth-child(odd) {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
.page-context-source-actions,
.doc .page-context-source-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.55rem;
}
html.dark-theme .page-context,
html.dark-theme .doc .page-context,
.dark-theme .page-context {
  --page-context-fg: color-mix(in srgb, var(--adt-ink-muted, #9aa3b2) 88%, transparent);
  --page-context-label: color-mix(in srgb, var(--adt-ink-muted, #9aa3b2) 78%, transparent);
  --page-context-border: rgba(255, 255, 255, 0.1);
  --page-context-divider: rgba(255, 255, 255, 0.08);
  --page-context-bg: rgba(255, 255, 255, 0.02);
}
`.trim()

function escapeHtml (text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function attr (doc, name) {
  const value = doc.getAttribute(name)
  if (value == null) return ''
  return String(value).trim()
}

function firstAttr (doc, names) {
  for (const name of names) {
    const value = attr(doc, name)
    if (value) return value
  }
  return ''
}

function hasRoleBlock (doc, role) {
  return doc.getBlocks().some((block) => {
    const roles = typeof block.getRoles === 'function' ? block.getRoles() : []
    return Array.isArray(roles) && roles.includes(role)
  })
}

/**
 * Parse site/playbook author map: JSON object or `Name=login;Other=login2`.
 * @param {string} raw
 * @returns {Record<string, string>}
 */
function parseAuthorMap (raw) {
  if (!raw) return {}
  const text = String(raw).trim()
  if (!text) return {}
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text)
      const out = {}
      for (const [k, v] of Object.entries(obj || {})) {
        if (k && v) out[String(k).trim()] = String(v).trim()
      }
      return out
    } catch {
      return {}
    }
  }
  const out = {}
  for (const part of text.split(/[;\n]+/)) {
    const m = part.match(/^\s*(.+?)\s*=\s*([A-Za-z0-9-]+)\s*$/)
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

/**
 * @param {string} raw
 * @returns {{ human: string, agent: string|null, display: string, meta: string }}
 */
function parseCredit (raw) {
  const text = String(raw || '').trim()
  if (!text) return { human: '', agent: null, display: '', meta: '' }

  let m = text.match(/^(.+?)\s*\(via\s+(.+?)\)\s*$/i)
  if (m) {
    const human = m[1].trim()
    const agent = shortenAgent(m[2].trim())
    return { human, agent, display: `${human} via ${agent}`, meta: human }
  }

  m = text.match(/^(.+?)\s+on behalf of\s+(.+)$/i)
  if (m) {
    const agent = shortenAgent(m[1].trim())
    const human = m[2].trim()
    return { human, agent, display: `${human} via ${agent}`, meta: human }
  }

  m = text.match(/^(.+?)\s+via\s+(.+)$/i)
  if (m) {
    const human = m[1].trim()
    const agent = shortenAgent(m[2].trim())
    return { human, agent, display: `${human} via ${agent}`, meta: human }
  }

  return { human: text, agent: null, display: text, meta: text }
}

function shortenAgent (agent) {
  return String(agent || '')
    .replace(/\s+agent$/i, '')
    .trim()
}

/**
 * Slug for keyword index URLs (stable, URL-safe).
 * @param {string} keyword
 */
function slugifyKeyword (keyword) {
  return String(keyword || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Split comma/semicolon keyword lists; preserve display text.
 * @param {string} raw
 * @returns {string[]}
 */
function splitKeywords (raw) {
  return String(raw || '')
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Keyword / tag values → muted underline links to filtered listing pages.
 * URL: `{base}/{slug}/` (indexify). Default base `/home/keywords`.
 * Override with AsciiDoc `page-context-keyword-base` (no trailing slash).
 * @param {object} doc
 * @param {string} raw
 */
function formatKeywordsHtml (doc, raw) {
  const parts = splitKeywords(raw)
  if (!parts.length) return ''
  const base = (attr(doc, 'page-context-keyword-base') || '/home/keywords').replace(/\/+$/, '')
  return parts
    .map((label) => {
      const slug = slugifyKeyword(label)
      if (!slug) return escapeHtml(label)
      const href = `${base}/${encodeURIComponent(slug)}/`
      return (
        `<a class="page-context-keyword" href="${escapeHtml(href)}">` +
        `${escapeHtml(label)}</a>`
      )
    })
    .join(', ')
}

/**
 * @param {object} doc
 * @param {string} human
 * @param {'orig'|'last'|string} which
 */
function resolveGithubLogin (doc, human, which) {
  const specific =
    which === 'orig'
      ? firstAttr(doc, ['page-orig-author-github', 'page-author-github'])
      : which === 'last'
        ? firstAttr(doc, ['page-last-author-github', 'page-author-github'])
        : attr(doc, 'page-author-github')
  if (specific) return specific.replace(/^@/, '')

  const map = {
    ...DEFAULT_AUTHOR_GITHUB,
    ...parseAuthorMap(attr(doc, 'page-context-authors')),
  }
  if (human && map[human]) return String(map[human]).replace(/^@/, '')
  return ''
}

/**
 * @param {object} doc
 * @param {string} rawCredit
 * @param {'orig'|'last'|string} which
 * @param {string} [viaAttr]
 */
function formatAuthorHtml (doc, rawCredit, which, viaAttr) {
  const parsed = parseCredit(rawCredit)
  let human = parsed.human
  let agent = parsed.agent
  if (!agent && viaAttr) agent = shortenAgent(viaAttr)
  const login = resolveGithubLogin(doc, human, which)
  const nameText = escapeHtml(human)
  const viaHtml = agent
    ? `<span class="page-context-via">via ${escapeHtml(agent)}</span>`
    : ''

  let nameHtml
  let avatarHtml = ''
  if (login) {
    const href = `https://github.com/${encodeURIComponent(login)}`
    const avatar = `https://github.com/${encodeURIComponent(login)}.png?size=40`
    nameHtml =
      `<a class="page-context-author-name" href="${escapeHtml(href)}" ` +
      `target="_blank" rel="noopener noreferrer">${nameText}</a>`
    avatarHtml =
      `<span class="page-context-avatar-wrap" aria-hidden="true">` +
      `<img class="page-context-avatar" src="${escapeHtml(avatar)}" width="18" height="18" ` +
      `alt="" loading="lazy" decoding="async"></span>`
  } else {
    nameHtml = `<span class="page-context-author-name">${nameText}</span>`
  }

  // Name (linked) → circular avatar → literal "via {agent}" (agent unlinked)
  return `<span class="page-context-author">${nameHtml}${avatarHtml}${viaHtml}</span>`
}

/**
 * Component start / portal home: no audience or usage-context chrome; authorship at end.
 * Opt-in via `:page-context-surface: component-home` (or `home`), or Antora default
 * ROOT module + pages/index.adoc (`page-module` + `page-relative-src-path`).
 */
function isComponentHomeSurface (doc) {
  const surface = attr(doc, 'page-context-surface').toLowerCase()
  if (surface === 'component-home' || surface === 'home') return true
  const module = attr(doc, 'page-module')
  const rel = attr(doc, 'page-relative-src-path').replace(/\\/g, '/')
  if (module === 'ROOT' && /^(?:\.\/)?index\.adoc$/i.test(rel)) return true
  return false
}

/**
 * @param {Field} field
 * @param {boolean} componentHome
 * @returns {'lead'|'footer'|null} null = suppress from visible asides
 */
function effectiveSection (field, componentHome) {
  if (!componentHome) return field.section
  const canonical = field.aliasOf || field.attr
  if (COMPONENT_HOME_SUPPRESS.has(field.attr) || COMPONENT_HOME_SUPPRESS.has(canonical)) {
    return null
  }
  if (COMPONENT_HOME_FOOTER_ATTRS.has(field.attr) || COMPONENT_HOME_FOOTER_ATTRS.has(canonical)) {
    return 'footer'
  }
  return field.section
}

function bylineDate (doc) {
  return firstAttr(doc, [
    'page-last-edited',
    'page-last-modified',
    'page-published',
    'page-date-published',
    'page-created',
    'page-date-created',
  ])
}

/**
 * Teaching-page byline: Last updated {date} by {name}{avatar} via {agent}
 * @returns {string} HTML fragment (empty if nothing to show)
 */
function buildBylineHtml (doc) {
  const date = bylineDate(doc)
  if (!date) return ''

  const lastRaw = firstAttr(doc, ['page-last-author', 'page-last-modified-by'])
  const parts = [
    `Last updated <time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>`,
  ]
  if (lastRaw) {
    const via = firstAttr(doc, ['page-last-via', 'page-via'])
    const authorHtml = formatAuthorHtml(doc, lastRaw, 'last', via)
    parts.push(`by ${authorHtml}`)
  }
  return `<p class="page-context-byline">${parts.join(' ')}</p>`
}

/**
 * Resolve schema fields for a section; honor aliases (prefer canonical attr when both set).
 * @param {object} [options]
 * @param {boolean} [options.componentHome]
 * @param {boolean} [options.omitBylineFields] — teaching pages: drop last-author/last-edited from footer when shown in byline
 * @returns {{ label: string, value: string, html: boolean }[]}
 */
function collectEntries (doc, section, options = {}) {
  const componentHome = Boolean(options.componentHome)
  const omitBylineFields = Boolean(options.omitBylineFields)
  const byline = bylineDate(doc)
  const seenLabels = new Set()
  const entries = []

  for (const field of SCHEMA) {
    const target = effectiveSection(field, componentHome)
    if (target !== section) continue

    if (omitBylineFields && section === 'footer') {
      const canonical = field.aliasOf || field.attr
      if (
        canonical === 'page-last-author' ||
        field.attr === 'page-last-author' ||
        field.attr === 'page-last-modified-by' ||
        canonical === 'page-last-edited' ||
        field.attr === 'page-last-edited' ||
        field.attr === 'page-last-modified'
      ) {
        // Latest contributor + last edited live in the teaching byline
        continue
      }
    }

    let value = ''
    let htmlField = Boolean(field.html)
    if (field.aliasOf) {
      const canonical = attr(doc, field.aliasOf)
      const aliasVal = attr(doc, field.attr)
      value = canonical || aliasVal
      if (!value || seenLabels.has(field.label)) continue
    } else {
      value = attr(doc, field.attr)
      if (!value || seenLabels.has(field.label)) continue
    }

    // Skip Created/Published when identical to byline date (teaching pages)
    if (
      omitBylineFields &&
      byline &&
      (field.label === 'Created' || field.label === 'Published' || field.label === 'Date') &&
      value === byline
    ) {
      continue
    }

    seenLabels.add(field.label)

    if (AUTHOR_LABELS.has(field.label)) {
      const which =
        field.label === 'Original author' || field.label === 'Author' || field.label === 'Authors'
          ? 'orig'
          : field.label === 'Latest contributor'
            ? 'last'
            : 'other'
      const via =
        which === 'last'
          ? firstAttr(doc, ['page-last-via', 'page-via'])
          : which === 'orig'
            ? firstAttr(doc, ['page-orig-via', 'page-via'])
            : attr(doc, 'page-via')
      value = formatAuthorHtml(doc, value, which, via)
      htmlField = true
    } else if (field.label === 'Keywords' || field.label === 'Tags') {
      value = formatKeywordsHtml(doc, value)
      htmlField = true
    }

    entries.push({ label: field.label, value, html: htmlField })
  }

  return entries
}

function buildAsideHtml (role, entries, options = {}) {
  const bylineHtml = options.bylineHtml || ''
  const forceShell = Boolean(options.forceShell)
  const rows = (entries || [])
    .filter((e) => e && e.value)
    .map((e) => {
      const cell = e.html ? e.value : escapeHtml(e.value)
      return `<tr><th scope="row">${escapeHtml(e.label)}</th><td>${cell}</td></tr>`
    })
    .join('')
  if (!rows && !bylineHtml && !forceShell) return ''
  const table =
    rows || forceShell
      ? `<table class="page-context-table"><tbody>${rows}</tbody></table>`
      : ''
  // Lead: byline stays in the outer seamless zone; table lives in an inner panel.
  // forceShell keeps an empty header zone on component homes so page-edit can attach Source.
  if (role === LEAD_ROLE) {
    const panel = table ? `<div class="page-context-panel">${table}</div>` : ''
    return `<aside class="page-context ${role}" role="note">${bylineHtml}${panel}</aside>`
  }
  // Footer: single panel zone on the aside.
  return `<aside class="page-context ${role}" role="note">${bylineHtml}${table}</aside>`
}

function styleTag () {
  return `<style type="text/css">\n${CSS}\n</style>\n`
}

/**
 * Antora converts pages in embedded mode and does not publish Asciidoctor head
 * docinfo, so the author-cluster gap never reached the byline or footer.
 * Emit the stylesheet once inside the first pass block (page content).
 */
function withPublishedStyle (doc, html) {
  if (!html) return html
  if (attr(doc, 'page-context-style-emitted')) return html
  doc.setAttribute('page-context-style-emitted', 'true')
  return `${styleTag()}${html}`
}

function createPassAside (self, parent, role, entries, options = {}) {
  const html = withPublishedStyle(docFrom(parent), buildAsideHtml(role, entries, options))
  if (!html) return null
  return self.createBlock(parent, 'pass', html, { role: `page-context ${role}` })
}

function docFrom (parent) {
  return typeof parent.getDocument === 'function' ? parent.getDocument() : parent
}

function metaPlainCredit (raw) {
  return parseCredit(raw).meta || String(raw || '').trim()
}

function buildMetaTags (doc) {
  const tags = []
  const emitted = new Set()
  for (const mapping of META_MAP) {
    let value = firstAttr(doc, mapping.attrs)
    if (!value) continue
    if (
      mapping.name === 'author' ||
      mapping.name === 'dcterms.creator' ||
      mapping.name === 'dcterms.contributor' ||
      mapping.name === 'citation_author' ||
      mapping.property === 'article:author'
    ) {
      value = metaPlainCredit(value)
    }
    const key = mapping.property
      ? `property:${mapping.property}`
      : `name:${mapping.name}`
    if (emitted.has(key)) continue
    emitted.add(key)
    if (mapping.property) {
      tags.push(
        `<meta property="${escapeHtml(mapping.property)}" content="${escapeHtml(value)}">`
      )
    } else {
      tags.push(`<meta name="${escapeHtml(mapping.name)}" content="${escapeHtml(value)}">`)
    }
  }
  tags.push(
    `<meta name="page-context-schema" content="${escapeHtml(SCHEMA_VERSION)}">`
  )
  return tags.join('\n')
}

function registerTreeProcessor (registry) {
  registry.treeProcessor(function () {
    const self = this
    self.process(function (doc) {
      if (!attr(doc, 'page-schema-version')) {
        doc.setAttribute('page-schema-version', SCHEMA_VERSION)
      }

      const home = isComponentHomeSurface(doc)
      const bylineHtml = home ? '' : buildBylineHtml(doc)
      const leadEntries = collectEntries(doc, 'lead', { componentHome: home })
      // Component homes still get an empty lead shell (header zone) for page-edit Source.
      if (!hasRoleBlock(doc, LEAD_ROLE) && (leadEntries.length || bylineHtml || home)) {
        const lead = createPassAside(self, doc, LEAD_ROLE, leadEntries, {
          bylineHtml,
          forceShell: home && !leadEntries.length && !bylineHtml,
        })
        if (lead) doc.getBlocks().unshift(lead)
      }

      const footerEntries = collectEntries(doc, 'footer', {
        componentHome: home,
        omitBylineFields: !home && Boolean(bylineHtml),
      }).filter((e) => e.label !== 'Schema')
      if (!hasRoleBlock(doc, FOOTER_ROLE) && footerEntries.length) {
        const footer = createPassAside(self, doc, FOOTER_ROLE, footerEntries)
        if (footer) doc.append(footer)
      }
    })
  })
}

function registerDocInfo (registry) {
  registry.docinfoProcessor(function () {
    const self = this
    self.atLocation('head')
    self.process(function (doc) {
      return `<style type="text/css">\n${CSS}\n</style>\n${buildMetaTags(doc)}`
    })
  })
}

/**
 * @param {object} registry - Asciidoctor extension registry
 * @param {object} [_context] - Antora scoped context (unused)
 */
function register (registry, _context) {
  registerTreeProcessor(registry)
  registerDocInfo(registry)
}

module.exports = register
module.exports.register = register
module.exports._internal = {
  attr,
  firstAttr,
  escapeHtml,
  buildAsideHtml,
  buildBylineHtml,
  buildMetaTags,
  collectEntries,
  parseCredit,
  formatAuthorHtml,
  formatKeywordsHtml,
  metaPlainCredit,
  slugifyKeyword,
  splitKeywords,
  resolveGithubLogin,
  parseAuthorMap,
  bylineDate,
  isComponentHomeSurface,
  effectiveSection,
  SCHEMA,
  META_MAP,
  LEAD_ROLE,
  FOOTER_ROLE,
  SCHEMA_VERSION,
  COMPONENT_HOME_SUPPRESS,
  COMPONENT_HOME_FOOTER_ATTRS,
  DEFAULT_AUTHOR_GITHUB,
  CSS,
}
