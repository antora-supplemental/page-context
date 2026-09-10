'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  collectKeywordIndex,
  buildKeywordBodyHtml,
  buildKeywordIndexBodyHtml,
  slugifyKeyword,
} = require('../lib/antora.js')._internal

describe('page-context antora keywords', () => {
  it('collects keywords from page asciidoc attributes', () => {
    const catalog = {
      getPages (filter) {
        const pages = [
          {
            out: {},
            pub: { url: '/general-knowledge/seo/' },
            src: { component: 'general-knowledge', relative: 'explanation/seo.adoc' },
            asciidoc: {
              doctitle: 'What SEO does',
              attributes: { 'page-keywords': 'SEO, metadata' },
            },
          },
          {
            out: {},
            pub: { url: '/home/about/' },
            src: { component: 'home', relative: 'about.adoc' },
            asciidoc: {
              doctitle: 'About',
              attributes: { 'page-tags': 'metadata' },
            },
          },
        ]
        return filter ? pages.filter(filter) : pages
      },
    }
    const index = collectKeywordIndex(catalog)
    assert.equal(index.get('seo').pages.length, 1)
    assert.equal(index.get('metadata').pages.length, 2)
    assert.equal(slugifyKeyword('SEO'), 'seo')
  })

  it('renders grouped article tree HTML', () => {
    const html = buildKeywordBodyHtml({
      label: 'SEO',
      slug: 'seo',
      pages: [
        { title: 'What SEO does', url: '/gk/seo/', component: 'general-knowledge' },
        { title: 'Listing tutorial', url: '/gk/listing/', component: 'general-knowledge' },
        { title: 'Home note', url: '/home/note/', component: 'home' },
      ],
    })
    assert.match(html, /page-context-keyword-index/)
    assert.match(html, /data-component="general-knowledge"/)
    assert.match(html, /data-component="home"/)
    assert.match(html, /What SEO does/)
    const indexHtml = buildKeywordIndexBodyHtml([
      { label: 'SEO', slug: 'seo', pages: [{ title: 'A', url: '/a/' }] },
    ])
    assert.match(indexHtml, /href="\.\/seo\/"/)
  })
})
