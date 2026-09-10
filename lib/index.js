'use strict'

/**
 * Render page-context metadata from AsciiDoc `page-*` attributes.
 *
 * Schema lives in SCHEMA (lead / footer / html-meta). Only set attributes
 * render. House-required subset (Dev-Centr): audience, orig-author, last-author.
 *
 * Agent-assisted authorship: "{product} on behalf of {human}".
 */

const LEAD_ROLE = 'page-context-lead'
const FOOTER_ROLE = 'page-context-footer'
const SCHEMA_VERSION = '0.3.0'

/**
 * @typedef {{ attr: string, label: string, section: 'lead'|'footer', aliasOf?: string }} Field
 */

/** @type {Field[]} */
const SCHEMA = [
  // --- Orientation (lead) — Diátaxis / SSG / Dublin Core audience ---
  { attr: 'page-audience', label: 'Audience', section: 'lead' },
  { attr: 'page-usage-context', label: 'Usage context', section: 'lead' },
  { attr: 'page-role', label: 'Role', section: 'lead' },
  { attr: 'page-doc-type', label: 'Document type', section: 'lead' },
  { attr: 'page-type', label: 'Document type', section: 'lead', aliasOf: 'page-doc-type' },
  { attr: 'page-diataxis', label: 'Diátaxis', section: 'lead' },
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

  // --- Classification (lead) ---
  { attr: 'page-keywords', label: 'Keywords', section: 'lead' },
  { attr: 'page-tags', label: 'Tags', section: 'lead' },
  { attr: 'page-category', label: 'Category', section: 'lead' },
  { attr: 'page-categories', label: 'Category', section: 'lead', aliasOf: 'page-category' },
  { attr: 'page-topic', label: 'Topic', section: 'lead' },
  { attr: 'page-subject', label: 'Topic', section: 'lead', aliasOf: 'page-topic' },
  { attr: 'page-series', label: 'Series', section: 'lead' },
  { attr: 'page-collection', label: 'Series', section: 'lead', aliasOf: 'page-series' },
  { attr: 'page-part-of', label: 'Part of', section: 'lead' },

  // --- Lifecycle / status ---
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

  // --- Authorship / provenance (lead — with orientation; colophon stays footer) ---
  { attr: 'page-orig-author', label: 'Original author', section: 'lead' },
  { attr: 'page-author', label: 'Author', section: 'lead' },
  { attr: 'page-authors', label: 'Authors', section: 'lead' },
  { attr: 'page-creator', label: 'Original author', section: 'lead', aliasOf: 'page-orig-author' },
  { attr: 'page-last-author', label: 'Latest contributor', section: 'lead' },
  { attr: 'page-last-modified-by', label: 'Latest contributor', section: 'lead', aliasOf: 'page-last-author' },
  { attr: 'page-contributors', label: 'Contributors', section: 'lead' },
  { attr: 'page-editor', label: 'Editor', section: 'lead' },
  { attr: 'page-reviewer', label: 'Reviewer', section: 'lead' },
  { attr: 'page-reviewers', label: 'Reviewer', section: 'lead', aliasOf: 'page-reviewer' },
  { attr: 'page-translator', label: 'Translator', section: 'lead' },
  { attr: 'page-maintainer', label: 'Maintainer', section: 'lead' },
  { attr: 'page-owner', label: 'Owner', section: 'lead' },

  // --- Dates / revision (lead) ---
  { attr: 'page-created', label: 'Created', section: 'lead' },
  { attr: 'page-date-created', label: 'Created', section: 'lead', aliasOf: 'page-created' },
  { attr: 'page-published', label: 'Published', section: 'lead' },
  { attr: 'page-date-published', label: 'Published', section: 'lead', aliasOf: 'page-published' },
  { attr: 'page-date', label: 'Date', section: 'lead' },
  { attr: 'page-last-edited', label: 'Last edited', section: 'lead' },
  { attr: 'page-last-modified', label: 'Last edited', section: 'lead', aliasOf: 'page-last-edited' },
  { attr: 'page-revised', label: 'Revised', section: 'lead' },
  { attr: 'page-revdate', label: 'Revised', section: 'lead', aliasOf: 'page-revised' },
  { attr: 'page-revision', label: 'Revision', section: 'lead' },
  { attr: 'page-revnumber', label: 'Revision', section: 'lead', aliasOf: 'page-revision' },
  { attr: 'page-version', label: 'Doc version', section: 'lead' },
  { attr: 'page-edition', label: 'Edition', section: 'lead' },

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
   Aside = panel chrome; table = rows only (keys left-aligned; UA th is center). */
.page-context {
  --page-context-fg: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 78%, transparent);
  --page-context-label: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 70%, transparent);
  --page-context-border: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 22%, transparent);
  --page-context-divider: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 16%, transparent);
  --page-context-bg: color-mix(in srgb, var(--adt-ink-muted, #5a6270) 5.5%, var(--adt-elevated, #fff));
}
.page-context-lead,
.page-context-footer,
.doc .page-context-lead,
.doc .page-context-footer {
  display: block;
  box-sizing: border-box;
  margin: 0.85rem 0 1rem;
  padding: 0.45rem 0.35rem;
  border: 1px solid var(--page-context-border, rgba(90, 98, 112, 0.22));
  border-radius: 2px;
  background: var(--page-context-bg, rgba(90, 98, 112, 0.05));
  background-image: none;
  box-shadow: none;
  /* Match in-doc TOC (.doc .toc) scale; stay dimmer than body copy. */
  font-size: 0.82em;
  line-height: 1.35;
  color: var(--page-context-fg, #6b7380);
}
.page-context-footer,
.doc .page-context-footer {
  margin-top: 2.25rem;
  margin-bottom: 1.35rem;
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
  vertical-align: top;
  text-align: left !important;
  font-weight: 400;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
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
 * Resolve schema fields for a section; honor aliases (prefer canonical attr when both set).
 * @returns {[string, string][]}
 */
function collectEntries (doc, section) {
  const seenLabels = new Set()
  const entries = []
  for (const field of SCHEMA) {
    if (field.section !== section) continue
    if (field.aliasOf) {
      // Prefer canonical when present; else use alias value under canonical label
      const canonical = attr(doc, field.aliasOf)
      const aliasVal = attr(doc, field.attr)
      const value = canonical || aliasVal
      if (!value || seenLabels.has(field.label)) continue
      seenLabels.add(field.label)
      entries.push([field.label, value])
      continue
    }
    const value = attr(doc, field.attr)
    if (!value || seenLabels.has(field.label)) continue
    seenLabels.add(field.label)
    entries.push([field.label, value])
  }

  // Compose latest contributor + date when both exist and date not already its own row
  if (section === 'lead') {
    const last = firstAttr(doc, ['page-last-author', 'page-last-modified-by'])
    const edited = firstAttr(doc, ['page-last-edited', 'page-last-modified'])
    if (last && edited) {
      const idx = entries.findIndex(([label]) => label === 'Latest contributor')
      if (idx >= 0 && !entries[idx][1].includes(edited)) {
        entries[idx][1] = `${entries[idx][1]} (${edited})`
      }
      // Drop standalone Last edited when folded into latest
      const editIdx = entries.findIndex(([label]) => label === 'Last edited' || label === 'Last modified')
      if (editIdx >= 0 && idx >= 0) entries.splice(editIdx, 1)
    }
  }

  return entries
}

function buildAsideHtml (role, entries) {
  const rows = entries
    .filter(([, value]) => value)
    .map(
      ([term, value]) =>
        `<tr><th scope="row">${escapeHtml(term)}</th><td>${escapeHtml(value)}</td></tr>`
    )
    .join('')
  if (!rows) return ''
  return `<aside class="page-context ${role}" role="note"><table class="page-context-table"><tbody>${rows}</tbody></table></aside>`
}

function createPassAside (self, parent, role, entries) {
  const html = buildAsideHtml(role, entries)
  if (!html) return null
  return self.createBlock(parent, 'pass', html, { role: `page-context ${role}` })
}

function buildMetaTags (doc) {
  const tags = []
  const emitted = new Set()
  for (const mapping of META_MAP) {
    const value = firstAttr(doc, mapping.attrs)
    if (!value) continue
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

      const leadEntries = collectEntries(doc, 'lead')
      if (!hasRoleBlock(doc, LEAD_ROLE) && leadEntries.length) {
        const lead = createPassAside(self, doc, LEAD_ROLE, leadEntries)
        if (lead) doc.getBlocks().unshift(lead)
      }

      const footerEntries = collectEntries(doc, 'footer').filter(
        ([label]) => label !== 'Schema'
      )
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
  buildMetaTags,
  collectEntries,
  SCHEMA,
  META_MAP,
  LEAD_ROLE,
  FOOTER_ROLE,
  SCHEMA_VERSION,
  CSS,
}
