'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const Asciidoctor = require('@asciidoctor/core')
const { register, _internal } = require('../lib/index.js')

function convert (src) {
  const A = Asciidoctor()
  const registry = A.Extensions.create()
  register(registry)
  return A.convert(src, {
    extension_registry: registry,
    standalone: true,
    safe: 'safe',
    attributes: { stylesheet: false },
  })
}

describe('page-context', () => {
  it('renders slim lead byline + orientation; authorship/classification in footer', () => {
    const html = convert(`= Demo
:page-audience: New org members
:page-usage-context: Docs hub teaching page
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-08-25
:page-doc-type: explanation
:page-diataxis: explanation
:page-keywords: seo, metadata

Body paragraph.
`)
    assert.match(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /page-context-byline/)
    assert.match(html, /Last updated/)
    assert.match(html, /2026-08-25/)
    assert.match(html, /page-context-table/)
    assert.match(html, /page-context-panel/)
    assert.match(html, /<th scope="row">Audience role<\/th>/)
    assert.match(html, /New org members/)
    assert.match(html, /<th scope="row">Usage context<\/th>/)
    assert.match(html, /Docs hub teaching page/)
    const lead = html.match(/aside class="page-context page-context-lead"[\s\S]*?<\/aside>/)[0]
    const footer = html.match(/aside class="page-context page-context-footer"[\s\S]*?<\/aside>/)[0]
    assert.match(lead, /<p class="page-context-byline">[\s\S]*?<\/p>\s*<div class="page-context-panel">/)
    assert.doesNotMatch(lead, /<table[\s\S]*page-context-byline/)
    assert.doesNotMatch(lead, /<table[\s\S]*Last updated/)
    const table = lead.match(/<table class="page-context-table"[\s\S]*?<\/table>/)[0]
    assert.doesNotMatch(table, /Last updated/)
    assert.doesNotMatch(table, /page-context-byline/)
    assert.doesNotMatch(lead, /Original author/)
    assert.doesNotMatch(lead, /Document type/)
    assert.match(footer, /Original author/)
    assert.match(footer, /<span class="page-context-author">/)
    // Antora drops head docinfo; the stylesheet must ship inside page content.
    const content = html.match(/<div id="content">([\s\S]*)<div id="footer">/)[1]
    assert.match(content, /<style type="text\/css">/)
    assert.match(content, /\.page-context-byline \.page-context-author/)
    assert.match(content, /\.page-context-footer \.page-context-author/)
    assert.match(content, /gap:\s*0\.4rem/)
    assert.equal((content.match(/<style type="text\/css">/g) || []).length, 1)
    assert.match(lead, /Ryan Johnson/)
    assert.match(lead, /<p class="page-context-byline">[\s\S]*<span class="page-context-author">/)
    assert.match(lead, /page-context-author-name[\s\S]*page-context-avatar-wrap[\s\S]*page-context-via/)
    assert.match(lead, /<span class="page-context-via">via Cursor<\/span>/)
    assert.doesNotMatch(lead, /\(via Cursor\)/)
    assert.match(footer, /Document type/)
    assert.match(footer, /Diátaxis/)
    assert.match(footer, /Keywords/)
    assert.match(html, /github\.com\/AMDphreak/)
    assert.match(html, /page-context-avatar/)
    assert.match(html, /page-context-avatar-wrap/)
    assert.match(html, /Body paragraph/)
  })

  it('puts authorship in footer when orientation attrs absent', () => {
    const html = convert(`= Demo
:page-orig-author: Ada
:page-last-author: Ada

Hi.
`)
    assert.doesNotMatch(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Original author/)
  })

  it('keeps status in lead and colophon fields in footer', () => {
    const html = convert(`= Demo
:page-audience: Maintainers
:page-status: draft
:page-keywords: antora, metadata
:page-license: MIT
:page-doi: 10.example/demo
:page-orig-author: Ada
:page-last-author: Ada
:page-lang: en

Hi.
`)
    assert.match(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /Status/)
    assert.match(html, /draft/)
    assert.match(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Keywords/)
    assert.match(html, /Original author/)
    assert.match(html, /License/)
    assert.match(html, /DOI/)
    assert.match(html, /name="keywords" content="antora, metadata"/)
    assert.match(html, /name="dcterms.audience" content="Maintainers"/)
    assert.match(html, /name="citation_doi" content="10.example\/demo"/)
    assert.match(html, /name="page-context-schema" content="0\.6\.8"/)
  })

  it('honors aliases (page-type → Document type) in footer', () => {
    const html = convert(`= Demo
:page-type: reference
:page-creator: Ada
:page-last-modified-by: Bea
:page-last-edited: 2026-09-10

Hi.
`)
    assert.match(html, /page-context-byline/)
    assert.match(html, /Bea/)
    assert.match(html, /Document type/)
    assert.match(html, /reference/)
    assert.match(html, /Original author/)
    assert.match(html, /Ada/)
    assert.match(html, /aside class="page-context page-context-footer"/)
  })

  it('parses legacy on-behalf-of into Name via Agent', () => {
    const parsed = _internal.parseCredit('Cursor agent on behalf of Ryan Johnson')
    assert.equal(parsed.human, 'Ryan Johnson')
    assert.equal(parsed.agent, 'Cursor')
    assert.equal(parsed.display, 'Ryan Johnson via Cursor')
    assert.equal(parsed.meta, 'Ryan Johnson')
  })

  it('formats author as linked name, circular avatar, then unlinked via', () => {
    const A = Asciidoctor()
    const doc = A.load(`= Demo
:page-last-author: Cursor agent on behalf of Ryan Johnson
`, { safe: 'safe' })
    const html = _internal.formatAuthorHtml(doc, 'Cursor agent on behalf of Ryan Johnson', 'last')
    assert.match(html, /^<span class="page-context-author">/)
    assert.match(
      html,
      /<a class="page-context-author-name" href="https:\/\/github\.com\/AMDphreak"[^>]*>Ryan Johnson<\/a>/
    )
    assert.match(html, /page-context-avatar-wrap[\s\S]*page-context-avatar/)
    assert.match(html, /<span class="page-context-via">via Cursor<\/span>/)
    assert.doesNotMatch(html, /href="[^"]*">[\s\S]*via Cursor/)
    assert.doesNotMatch(html, /\(via/)
    // Name before avatar before via
    const nameIdx = html.indexOf('page-context-author-name')
    const avatarIdx = html.indexOf('page-context-avatar-wrap')
    const viaIdx = html.indexOf('page-context-via')
    assert.ok(nameIdx < avatarIdx && avatarIdx < viaIdx)
  })

  it('meta credit stays plain human name without via', () => {
    assert.equal(_internal.metaPlainCredit('Cursor agent on behalf of Ryan Johnson'), 'Ryan Johnson')
  })

  it('escapes HTML in attribute values', () => {
    const html = _internal.buildAsideHtml('page-context-lead', [
      { label: 'Audience role', value: '<script>x</script>', html: false },
    ])
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<script>/)
  })

  it('exposes a large schema covering common tokens', () => {
    assert.ok(_internal.SCHEMA.length >= 60)
    const attrs = new Set(_internal.SCHEMA.map((f) => f.attr))
    for (const name of [
      'page-audience',
      'page-keywords',
      'page-status',
      'page-license',
      'page-doi',
      'page-orcid',
      'page-lang',
      'page-prerequisites',
      'page-diataxis',
    ]) {
      assert.ok(attrs.has(name), `missing ${name}`)
    }
    const byAttr = Object.fromEntries(_internal.SCHEMA.map((f) => [f.attr, f.section]))
    assert.equal(byAttr['page-audience'], 'lead')
    assert.equal(byAttr['page-orig-author'], 'footer')
    assert.equal(byAttr['page-last-author'], 'footer')
    assert.equal(byAttr['page-keywords'], 'footer')
    assert.equal(byAttr['page-doc-type'], 'footer')
    assert.equal(byAttr['page-last-edited'], 'footer')
    assert.equal(byAttr['page-license'], 'footer')
    assert.equal(byAttr['page-doi'], 'footer')
    assert.equal(_internal.SCHEMA_VERSION, '0.6.8')
  })

  it('links GitHub login without avatar when page-context-author-avatar is off', () => {
    const A = Asciidoctor()
    const doc = A.load(
      `= Demo
:page-last-author-github: AMDphreak
:page-context-author-avatar: without-icon
:page-last-author: amdphreak via cursor-agent
`,
      { safe: 'safe' }
    )
    const html = _internal.formatAuthorHtml(doc, 'amdphreak via cursor-agent', 'last')
    assert.match(
      html,
      /<a class="page-context-author-name" href="https:\/\/github\.com\/AMDphreak"[^>]*>amdphreak<\/a>/
    )
    assert.doesNotMatch(html, /page-context-avatar/)
    assert.match(html, /<span class="page-context-via">via cursor-agent<\/span>/)
  })

  it('playbook without page-context-author-avatar keeps circular avatar when login known', () => {
    const html = convert(`= Demo
:page-audience: Readers
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-09-10
:page-orig-author: Ryan Johnson

Hi.
`)
    assert.match(html, /page-context-avatar-wrap/)
    assert.match(html, /github\.com\/AMDphreak/)
  })

  it('page-context-author-avatar: false suppresses avatar but keeps GitHub link', () => {
    const html = convert(`= Demo
:page-audience: Readers
:page-context-author-avatar: false
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-09-10
:page-orig-author: Ryan Johnson

Hi.
`)
    assert.match(html, /<a class="page-context-author-name" href="https:\/\/github\.com\/AMDphreak"/)
    const authorClusters = html.match(/<span class="page-context-author">[\s\S]*?<\/span>/g) || []
    assert.ok(authorClusters.length > 0)
    for (const cluster of authorClusters) {
      assert.doesNotMatch(cluster, /page-context-avatar-wrap/)
      assert.doesNotMatch(cluster, /page-context-avatar"/)
    }
  })

  it('authorAvatarEnabled defaults true and accepts with-icon / without-icon aliases', () => {
    const A = Asciidoctor()
    const docDefault = A.load('= Demo\n', { safe: 'safe' })
    assert.equal(_internal.authorAvatarEnabled(docDefault), true)
    const docOff = A.load('= Demo\n:page-context-author-avatar: without-icon\n', { safe: 'safe' })
    assert.equal(_internal.authorAvatarEnabled(docOff), false)
    const docOn = A.load('= Demo\n:page-context-author-avatar: with-icon\n', { safe: 'safe' })
    assert.equal(_internal.authorAvatarEnabled(docOn), true)
  })

  it('resolves @handle in author credit as GitHub login for linking', () => {
    const A = Asciidoctor()
    const doc = A.load('= Demo\n:page-last-author: @AMDphreak via Cursor\n', { safe: 'safe' })
    const html = _internal.formatAuthorHtml(doc, '@AMDphreak via Cursor', 'last')
    assert.match(html, /href="https:\/\/github\.com\/AMDphreak"/)
  })

  it('ships independent table CSS without zebra and with byline/avatar', () => {
    const css = _internal.CSS
    assert.match(css, /\.page-context-table/)
    assert.match(css, /\.page-context-byline/)
    assert.match(css, /\.page-context-panel/)
    assert.match(css, /\.page-context-avatar/)
    assert.match(css, /\.page-context-avatar-wrap/)
    assert.match(css, /\.page-context-author[\s\S]*align-items:\s*center/)
    assert.match(css, /\.page-context-byline \.page-context-author/)
    assert.match(css, /\.page-context-footer \.page-context-author/)
    assert.match(css, /\.page-context-author[\s\S]*display:\s*inline-flex\s*!important/)
    assert.match(css, /\.page-context-author[\s\S]*gap:\s*0\.4rem/)
    assert.match(css, /\.page-context-avatar-wrap[\s\S]*border-radius:\s*50%/)
    assert.match(css, /\.page-context-avatar-wrap[\s\S]*overflow:\s*hidden/)
    assert.match(css, /\.page-context-avatar[\s\S]*object-fit:\s*cover/)
    assert.match(css, /--page-context-divider/)
    assert.match(css, /--page-context-bg/)
    assert.match(css, /nth-child\(even\)/)
    assert.match(css, /background:\s*transparent\s*!important/)
    assert.match(css, /font-size:\s*0\.82em/)
    assert.match(css, /text-align:\s*left\s*!important/)
    assert.match(css, /\.page-context-footer[\s\S]*margin-top:\s*2\.25rem/)
    assert.match(css, /padding:\s*0\.35rem\s*0\.9rem/)
    assert.match(css, /\.page-context-lead[\s\S]*border:\s*none/)
    assert.match(css, /\.page-context-panel[\s\S]*border:\s*1px solid/)
  })

  it('buildAsideHtml keeps byline outside the table and panel', () => {
    const html = _internal.buildAsideHtml(
      'page-context-lead',
      [{ label: 'Audience role', value: 'Readers', html: false }],
      { bylineHtml: '<p class="page-context-byline">Last updated <time>2026-09-10</time></p>' }
    )
    assert.match(html, /^<aside class="page-context page-context-lead"/)
    assert.match(html, /page-context-byline[\s\S]*page-context-panel[\s\S]*page-context-table/)
    assert.doesNotMatch(html, /<table[\s\S]*Last updated/)
    assert.doesNotMatch(html, /<table[\s\S]*page-context-byline/)
  })

  it('component home: hides audience/usage; empty lead shell; authorship in footer', () => {
    const html = convert(`= Component home
:page-context-surface: component-home
:page-audience: Readers starting here
:page-usage-context: Component start page
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-09-10

Welcome body.
`)
    assert.match(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /page-context-panel/)
    assert.match(html, /page-context-table/)
    assert.doesNotMatch(html, /<p class="page-context-byline"/)
    assert.doesNotMatch(html, /<th scope="row">Audience role<\/th>/)
    assert.doesNotMatch(html, /Usage context/)
    assert.match(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Original author/)
    assert.match(html, /Ryan Johnson/)
    assert.match(html, /<span class="page-context-via">via Cursor<\/span>/)
    assert.doesNotMatch(html, /\(via Cursor\)/)
    assert.match(html, /Welcome body/)
    assert.match(html, /name="dcterms.audience" content="Readers starting here"/)
  })

  it('component home: auto-detect Antora ROOT index.adoc', () => {
    const html = convert(`= Portal
:page-module: ROOT
:page-relative-src-path: index.adoc
:page-audience: Hub visitors
:page-usage-context: Docs hub home
:page-orig-author: Ada
:page-last-author: Bea

Hi.
`)
    assert.doesNotMatch(html, /<th scope="row">Audience role<\/th>/)
    assert.doesNotMatch(html, /Usage context/)
    assert.match(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Original author/)
    assert.match(html, /Ada/)
  })

  it('component home: section landing (non-ROOT index) keeps lead chrome', () => {
    const html = convert(`= Tutorials
:page-module: tutorials
:page-relative-src-path: index.adoc
:page-audience: New learners
:page-usage-context: Section landing
:page-orig-author: Ada
:page-last-author: Ada
:page-last-edited: 2026-09-10

Hi.
`)
    assert.match(html, /page-context-lead/)
    assert.match(html, /page-context-byline/)
    assert.match(html, /Audience/)
    assert.match(html, /Usage context/)
  })

  it('links keywords to filtered listing URLs with muted underline CSS', () => {
    const html = convert(`= Demo
:page-keywords: SEO, search engine optimization
:page-orig-author: Ada
:page-last-author: Ada

Hi.
`)
    assert.match(html, /class="page-context-keyword"/)
    assert.match(html, /href="\/home\/keywords\/seo\/"/)
    assert.match(html, /href="\/home\/keywords\/search-engine-optimization\/"/)
    assert.match(_internal.CSS, /a\.page-context-keyword/)
    assert.match(_internal.CSS, /color:\s*inherit/)
    assert.match(_internal.CSS, /text-decoration:\s*underline/)
    assert.equal(_internal.slugifyKeyword('Search Engine Optimization'), 'search-engine-optimization')
  })

  it('honors page-context-keyword-base for keyword links', () => {
    const html = convert(`= Demo
:page-context-keyword-base: /docs/keywords
:page-keywords: antora
:page-orig-author: Ada
:page-last-author: Ada

Hi.
`)
    assert.match(html, /href="\/docs\/keywords\/antora\/"/)
  })

  it('omits duplicate Created/Published when equal to byline date', () => {
    const html = convert(`= Demo
:page-audience: Readers
:page-last-author: Ryan Johnson
:page-last-edited: 2026-09-09
:page-created: 2026-09-09
:page-published: 2026-09-09
:page-orig-author: Ryan Johnson

Hi.
`)
    assert.match(html, /page-context-byline/)
    assert.doesNotMatch(html, /<th scope="row">Created<\/th>/)
    assert.doesNotMatch(html, /<th scope="row">Published<\/th>/)
  })
})
