'use strict'

/**
 * Antora extension: generate keyword / tag index pages that list articles
 * filtered by that keyword (grouped by component — a filtered tree).
 *
 * Pairs with the Asciidoctor page-context extension, which links Keywords/Tags
 * to `{base}/{slug}/` (default `/home/keywords/{slug}/`).
 *
 * Playbook:
 *
 *   antora:
 *     extensions:
 *       - require: '@antora-supplemental/page-context/antora'
 *         component: home          # host component for index pages
 *         path: keywords           # module-relative folder
 *   asciidoc:
 *     attributes:
 *       page-context-keyword-base: '/home/keywords'
 */

const { slugifyKeyword, splitKeywords } = require('./index.js')._internal

function escapeHtml (text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pageAttr (page, name) {
  const attrs = (page.asciidoc && page.asciidoc.attributes) || {}
  const value = attrs[name]
  if (value == null || value === '') return ''
  return String(value).trim()
}

function pageKeywords (page) {
  const raw = pageAttr(page, 'page-keywords') || pageAttr(page, 'page-tags')
  return splitKeywords(raw)
}

function pageTitle (page) {
  return (
    (page.asciidoc && page.asciidoc.doctitle) ||
    (page.src && page.src.stem) ||
    'Untitled'
  )
}

function pageUrl (page) {
  return (page.pub && page.pub.url) || ''
}

/**
 * @param {object} contentCatalog
 * @returns {Map<string, { label: string, slug: string, pages: object[] }>}
 */
function collectKeywordIndex (contentCatalog) {
  /** @type {Map<string, { label: string, slug: string, pages: object[] }>} */
  const index = new Map()
  for (const page of contentCatalog.getPages((p) => p.out)) {
    if (page.src && String(page.src.relative || '').startsWith('keywords/')) continue
    const keywords = pageKeywords(page)
    if (!keywords.length) continue
    const entry = {
      title: pageTitle(page),
      url: pageUrl(page),
      component: page.src && page.src.component,
      version: page.src && page.src.version,
      module: page.src && page.src.module,
    }
    for (const label of keywords) {
      const slug = slugifyKeyword(label)
      if (!slug) continue
      if (!index.has(slug)) {
        index.set(slug, { label, slug, pages: [] })
      } else if (!index.get(slug).label) {
        index.get(slug).label = label
      }
      const bucket = index.get(slug)
      if (!bucket.pages.some((p) => p.url === entry.url && entry.url)) {
        bucket.pages.push(entry)
      }
    }
  }
  return index
}

function resolveHost (contentCatalog, config) {
  const preferred = config.component || 'home'
  const components = contentCatalog.getComponents()
  let component =
    components.find((c) => c.name === preferred) ||
    components.find((c) => c.name === 'ROOT') ||
    components[0]
  if (!component) return null
  const version =
    (component.latest && component.latest.version) != null
      ? component.latest.version
      : (component.versions[0] && component.versions[0].version) || ''
  return { name: component.name, version, title: component.title || component.name }
}

function buildKeywordBodyHtml (entry) {
  /** @type {Map<string, object[]>} */
  const byComponent = new Map()
  for (const page of entry.pages) {
    const key = page.component || 'site'
    if (!byComponent.has(key)) byComponent.set(key, [])
    byComponent.get(key).push(page)
  }
  const sections = [...byComponent.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([component, pages]) => {
      const items = pages
        .slice()
        .sort((a, b) => String(a.title).localeCompare(String(b.title)))
        .map((p) => {
          const href = p.url || '#'
          return `<li><a href="${escapeHtml(href)}">${escapeHtml(p.title)}</a></li>`
        })
        .join('\n')
      return (
        `<section class="page-context-keyword-group" data-component="${escapeHtml(component)}">\n` +
        `<h2>${escapeHtml(component)}</h2>\n` +
        `<ul class="page-context-keyword-tree">\n${items}\n</ul>\n` +
        `</section>`
      )
    })
    .join('\n')
  return (
    `<div class="page-context-keyword-index" data-keyword="${escapeHtml(entry.slug)}">\n` +
    `<p>Articles that use the keyword <strong>${escapeHtml(entry.label)}</strong>.</p>\n` +
    `${sections}\n` +
    `</div>`
  )
}

function buildKeywordIndexBodyHtml (entries) {
  const items = entries
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((e) => {
      const href = `./${encodeURIComponent(e.slug)}/`
      const count = e.pages.length
      return (
        `<li><a class="page-context-keyword" href="${escapeHtml(href)}">` +
        `${escapeHtml(e.label)}</a> (${count})</li>`
      )
    })
    .join('\n')
  return (
    `<div class="page-context-keyword-index" data-keyword-index="true">\n` +
    `<p>Browse articles by keyword.</p>\n` +
    `<ul class="page-context-keyword-tree">\n${items}\n</ul>\n` +
    `</div>`
  )
}

function addKeywordPage (contentCatalog, host, relative, title, bodyHtml) {
  const basename = relative.split('/').pop()
  const stem = basename.replace(/\.adoc$/i, '')
  contentCatalog.addFile({
    contents: Buffer.from(bodyHtml),
    mediaType: 'text/html',
    src: {
      component: host.name,
      version: host.version,
      module: 'ROOT',
      family: 'page',
      relative,
      basename,
      stem,
      extname: '.adoc',
    },
    asciidoc: {
      doctitle: title,
      attributes: {
        'page-context-surface': 'component-home',
        robots: 'noindex',
      },
    },
  })
}

/**
 * @param {{ config?: object }} context
 */
function register (context = {}) {
  const config = context.config || {}
  const pathPrefix = String(config.path || 'keywords').replace(/^\/+|\/+$/g, '') || 'keywords'
  const logger = this.getLogger('@antora-supplemental/page-context/antora')

  this.on('documentsConverted', ({ contentCatalog }) => {
    const host = resolveHost(contentCatalog, config)
    if (!host) {
      logger.warn('No content component available for keyword index pages')
      return
    }
    const index = collectKeywordIndex(contentCatalog)
    if (!index.size) {
      logger.info('No page-keywords / page-tags found; skipping keyword index pages')
      return
    }
    const entries = [...index.values()]
    addKeywordPage(
      contentCatalog,
      host,
      `${pathPrefix}/index.adoc`,
      'Keywords',
      buildKeywordIndexBodyHtml(entries)
    )
    for (const entry of entries) {
      // index.adoc → folder URL under indexify: /{component}/keywords/{slug}/
      addKeywordPage(
        contentCatalog,
        host,
        `${pathPrefix}/${entry.slug}/index.adoc`,
        `Keyword: ${entry.label}`,
        buildKeywordBodyHtml(entry)
      )
    }
    logger.info(
      `Generated ${entries.length} keyword page(s) under ${host.name}/${pathPrefix}/`
    )
  })
}

module.exports = register
module.exports.register = register
module.exports._internal = {
  collectKeywordIndex,
  slugifyKeyword,
  splitKeywords,
  buildKeywordBodyHtml,
  buildKeywordIndexBodyHtml,
  resolveHost,
  pageKeywords,
}
