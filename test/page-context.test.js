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
  it('renders orientation + authorship in lead (no footer for house subset)', () => {
    const html = convert(`= Demo
:page-audience: New org members
:page-usage-context: Docs hub teaching page
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-08-25

Body paragraph.
`)
    assert.match(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /page-context-table/)
    assert.match(html, /<th scope="row">Audience<\/th>/)
    assert.match(html, /New org members/)
    assert.match(html, /<th scope="row">Usage context<\/th>/)
    assert.match(html, /Docs hub teaching page/)
    assert.match(html, /Original author/)
    assert.match(html, /Ryan Johnson/)
    assert.match(html, /Cursor agent on behalf of Ryan Johnson \(2026-08-25\)/)
    assert.doesNotMatch(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Body paragraph/)
  })

  it('puts authorship in lead when orientation attrs absent', () => {
    const html = convert(`= Demo
:page-orig-author: Ada
:page-last-author: Ada

Hi.
`)
    assert.match(html, /aside class="page-context page-context-lead"/)
    assert.doesNotMatch(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Original author/)
  })

  it('keeps colophon fields in footer', () => {
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
    assert.match(html, /Keywords/)
    assert.match(html, /Original author/)
    assert.match(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /License/)
    assert.match(html, /DOI/)
    assert.match(html, /name="keywords" content="antora, metadata"/)
    assert.match(html, /name="dcterms.audience" content="Maintainers"/)
    assert.match(html, /name="citation_doi" content="10.example\/demo"/)
    assert.match(html, /name="page-context-schema"/)
  })

  it('honors aliases (page-type → Document type)', () => {
    const html = convert(`= Demo
:page-type: reference
:page-creator: Ada
:page-last-modified-by: Bea

Hi.
`)
    assert.match(html, /Document type/)
    assert.match(html, /reference/)
    assert.match(html, /Original author/)
    assert.match(html, /Ada/)
    assert.match(html, /Latest contributor/)
    assert.match(html, /Bea/)
    assert.match(html, /aside class="page-context page-context-lead"/)
  })

  it('escapes HTML in attribute values', () => {
    const html = _internal.buildAsideHtml('page-context-lead', [
      ['Audience', '<script>x</script>'],
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
    assert.equal(byAttr['page-orig-author'], 'lead')
    assert.equal(byAttr['page-last-edited'], 'lead')
    assert.equal(byAttr['page-version'], 'lead')
    assert.equal(byAttr['page-license'], 'footer')
    assert.equal(byAttr['page-doi'], 'footer')
  })

  it('ships independent table CSS without zebra and with cell dividers', () => {
    const css = _internal.CSS
    assert.match(css, /\.page-context-table/)
    assert.match(css, /--page-context-divider/)
    assert.match(css, /--page-context-bg/)
    assert.match(css, /nth-child\(even\)/)
    assert.match(css, /background:\s*transparent\s*!important/)
    assert.match(css, /font-size:\s*0\.82em/)
    assert.match(css, /text-align:\s*left\s*!important/)
    assert.match(css, /\.page-context-footer[\s\S]*margin-top:\s*2\.25rem/)
    assert.match(css, /padding:\s*0\.35rem\s*0\.9rem/)
  })

  it('component home: hides audience/usage; authorship in footer (opt-in surface)', () => {
    const html = convert(`= Component home
:page-context-surface: component-home
:page-audience: Readers starting here
:page-usage-context: Component start page
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-09-10

Welcome body.
`)
    assert.doesNotMatch(html, /aside class="page-context page-context-lead"/)
    assert.doesNotMatch(html, /<th scope="row">Audience<\/th>/)
    assert.doesNotMatch(html, /Usage context/)
    assert.match(html, /aside class="page-context page-context-footer"/)
    assert.match(html, /Original author/)
    assert.match(html, /Ryan Johnson/)
    assert.match(html, /Cursor agent on behalf of Ryan Johnson \(2026-09-10\)/)
    assert.match(html, /Welcome body/)
    // HTML meta still carries audience for machines
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
    assert.doesNotMatch(html, /<th scope="row">Audience<\/th>/)
    assert.doesNotMatch(html, /Usage context/)
    assert.doesNotMatch(html, /aside class="page-context page-context-lead"/)
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

Hi.
`)
    assert.match(html, /page-context-lead/)
    assert.match(html, /Audience/)
    assert.match(html, /Usage context/)
  })
})
