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
  it('renders audience lead and author footer from page-* attrs', () => {
    const html = convert(`= Demo
:page-audience: New org members
:page-usage-context: Docs hub teaching page
:page-orig-author: Ryan Johnson
:page-last-author: Cursor agent on behalf of Ryan Johnson
:page-last-edited: 2026-08-25

Body paragraph.
`)
    assert.match(html, /page-context-lead/)
    assert.match(html, /Audience/)
    assert.match(html, /New org members/)
    assert.match(html, /Usage context/)
    assert.match(html, /Docs hub teaching page/)
    assert.match(html, /page-context-footer/)
    assert.match(html, /Original author/)
    assert.match(html, /Ryan Johnson/)
    assert.match(html, /Cursor agent on behalf of Ryan Johnson \(2026-08-25\)/)
    assert.match(html, /Body paragraph/)
  })

  it('skips lead when audience attrs absent', () => {
    const html = convert(`= Demo
:page-orig-author: Ada
:page-last-author: Ada

Hi.
`)
    assert.doesNotMatch(html, /aside class="page-context page-context-lead"/)
    assert.match(html, /aside class="page-context page-context-footer"/)
  })

  it('escapes HTML in attribute values', () => {
    const html = _internal.buildAsideHtml('page-context-lead', [
      ['Audience', '<script>x</script>'],
    ])
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<script>/)
  })
})
