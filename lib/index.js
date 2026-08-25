'use strict'

/**
 * Render Dev-Centr page-context metadata from AsciiDoc page attributes.
 *
 * Schema (document header):
 *   :page-audience: …
 *   :page-usage-context: …          (optional)
 *   :page-orig-author: …
 *   :page-last-author: …            (agent-assisted: "<agent> on behalf of <human>")
 *   :page-last-edited: YYYY-MM-DD   (optional)
 *
 * Injects a lead (audience / usage) and footer (authors). Skip either block when
 * its attributes are absent. Idempotent when matching role blocks already exist.
 */

const LEAD_ROLE = 'page-context-lead'
const FOOTER_ROLE = 'page-context-footer'

const CSS = `
.page-context-lead,
.page-context-footer {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-inline-start: 3px solid var(--color-border, #c5c5c5);
  background: var(--color-panel-bg, rgba(127, 127, 127, 0.08));
  font-size: 0.95em;
}
.page-context dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
}
.page-context dt {
  font-weight: 600;
  margin: 0;
}
.page-context dd {
  margin: 0;
}
.page-context-footer {
  margin-top: 2rem;
  opacity: 0.92;
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

function hasRoleBlock (doc, role) {
  return doc.getBlocks().some((block) => {
    const roles = typeof block.getRoles === 'function' ? block.getRoles() : []
    return Array.isArray(roles) && roles.includes(role)
  })
}

function buildAsideHtml (role, entries) {
  const rows = entries
    .filter(([, value]) => value)
    .map(
      ([term, value]) =>
        `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`
    )
    .join('')
  if (!rows) return ''
  return `<aside class="page-context ${role}" role="note"><dl>${rows}</dl></aside>`
}

function createPassAside (self, parent, role, entries) {
  const html = buildAsideHtml(role, entries)
  if (!html) return null
  return self.createBlock(parent, 'pass', html, { role: `page-context ${role}` })
}

function registerTreeProcessor (registry) {
  registry.treeProcessor(function () {
    const self = this
    self.process(function (doc) {
      const audience = attr(doc, 'page-audience')
      const usage = attr(doc, 'page-usage-context')
      const orig = attr(doc, 'page-orig-author')
      const last = attr(doc, 'page-last-author')
      const edited = attr(doc, 'page-last-edited')

      if (!hasRoleBlock(doc, LEAD_ROLE) && (audience || usage)) {
        const lead = createPassAside(self, doc, LEAD_ROLE, [
          ['Audience', audience],
          ['Usage context', usage],
        ])
        if (lead) doc.getBlocks().unshift(lead)
      }

      if (!hasRoleBlock(doc, FOOTER_ROLE) && (orig || last)) {
        const latest = edited && last ? `${last} (${edited})` : last
        const footer = createPassAside(self, doc, FOOTER_ROLE, [
          ['Original author', orig],
          ['Latest contributor', latest],
        ])
        if (footer) doc.append(footer)
      }
    })
  })
}

function registerDocInfo (registry) {
  registry.docinfoProcessor(function () {
    const self = this
    self.atLocation('head')
    self.process(function () {
      return `<style type="text/css">\n${CSS}\n</style>`
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
  escapeHtml,
  buildAsideHtml,
  LEAD_ROLE,
  FOOTER_ROLE,
  CSS,
}
