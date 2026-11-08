'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Asciidoctor = require('@asciidoctor/core')
const { register, _internal } = require('../lib/index.js')
const { redactPublicText, publicProvenance } = require('../lib/provenance-redaction.js')

test('public mirror removes emails, paths, credentials and capability URLs', () => {
  for (const raw of ['bob@localhost', 'person@example.test', 'Bearer synthetic-value', 'sk-syntheticvalue', 'https://example.test/capability', 'C:\\Users\\person\\file', '/home/person/file', '../private/file', 'password="two words"']) {
    assert.notEqual(redactPublicText(raw), raw)
  }
  assert.deepEqual(publicProvenance({ human: 'Ryan', harness: 'future-harness', model: 'unknown', session: 'opaque-session', custom_attributes: { secret: 'synthetic' }, messages_url: 'https://example.test/capability' }), { human: 'Ryan', harness: 'future-harness', model: 'unknown', session: 'opaque-session' })
})
test('structured provenance appears compactly and safely; emails do not enter metadata', () => {
  const A = Asciidoctor()
  const registry = A.Extensions.create()
  register(registry)
  const html = A.convert(`= Demo
:page-last-author: name=Ryan <private@example.test>; harness=future-harness; model=exact-model-v9; session=session-123
:page-orig-author: Person <orig@example.test>
:page-last-edited: 2026-11-08

Content.
`, { extension_registry: registry, standalone: true, safe: 'safe', attributes: { stylesheet: false } })
  assert.match(html, /future-harness \/ exact-model-v9 \/ session session-123/)
  assert.doesNotMatch(html, /private@example|orig@example/)
})
test('separate attributes override structured values without breaking legacy credit', () => {
  const doc = { getAttribute: key => ({ 'page-last-author-harness': 'new-tool', 'page-last-author-model': '<model>', 'page-last-author-session': 'opaque-label' })[key] }
  const html = _internal.formatAuthorHtml(doc, 'Cursor agent on behalf of Ryan Johnson', 'last')
  assert.match(html, /new-tool \/ &lt;model&gt; \/ session opaque-label/)
  assert.match(_internal.formatAuthorHtml({ getAttribute: () => undefined }, 'Cursor agent on behalf of Ryan Johnson', 'last'), /via Cursor/)
})
test('emails and capability credentials cannot leak through profile links or metadata', () => {
  const doc = { getAttribute: () => undefined }
  const html = _internal.formatAuthorHtml(doc, 'name=Ryan; username=private@example.test; provider=github; url=https://example.test/private%40example.test', 'last')
  assert.doesNotMatch(html, /private@example|private%40example|href=/)
  assert.equal(_internal.metaPlainCredit('Person <private@example.test>'), 'Person <[redacted-email]>')
  const unsafe = _internal.formatAuthorHtml(doc, 'name=Ryan; url=https://example.test/profile?token=synthetic; harness=Cursor; model=unknown; session=sk-syntheticvalue', 'last')
  assert.doesNotMatch(unsafe, /token=synthetic|sk-syntheticvalue|href=/)
})
