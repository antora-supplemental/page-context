'use strict'

// Small public-render mirror of git-ai-provenance (DevCentr), not a general DLP engine.
// Do not add transcript fetching, capability links or custom attribute publication here.
function redactPublicText (value) {
  return String(value || '')
    .replace(/-----BEGIN [^-]*(?:PRIVATE KEY|SECRET)[^-]*-----[\s\S]*?-----END [^-]+-----/g, '[redacted-secret]')
    .replace(/\b(?:https?|file):\/\/[^\s<>"']+/gi, '[redacted-url]')
    .replace(/[^\s<>"'()]+@[^\s<>"'(),;]+/g, '[redacted-email]')
    .replace(/\b(?:authorization|token|api[_-]?key|secret|password|credential)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;<>"']+)/gi, '[redacted-secret]')
    .replace(/(?:^|[\s"'=])(?:\.{1,2}[\\/]|~[\\/])[^\s<>"']+/g, ' [redacted-path]')
    .replace(/(?:[a-z]:[\\/]|\\\\)[^\r\n<>"']+/gi, '[redacted-path]')
    .replace(/(?:^|[\s"'=])\/?\/(?:[^\s<>"']+)/g, ' [redacted-path]')
    .replace(/\b(?:authorization|bearer|token|api[_-]?key|secret|password|credential)\b\s*[:=]?\s*[^\s,;<>"']+/gi, '[redacted-secret]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]+)\b/g, '[redacted-secret]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-secret]')
    .replace(/[A-Za-z0-9_+/=-]{40,}/g, '[redacted-secret]')
}

function publicSessionLabel (value) {
  const s = String(value || '')
  if (/^[A-Za-z0-9_.-]{1,128}$/.test(s) && !/^(?:sk-|gh|AKIA|xox|eyJ)/.test(s)) return s
  return redactPublicText(s)
}

function publicProvenance (input = {}) {
  // Explicit output vocabulary: transcripts/URLs/custom attributes are always omitted.
  return {
    human: redactPublicText(input.human),
    harness: redactPublicText(input.harness),
    model: redactPublicText(input.model),
    session: publicSessionLabel(input.session),
  }
}

function publicProfileUrl (value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return ''
    const decoded = decodeURIComponent(url.host + url.pathname)
    if (redactPublicText(decoded) !== decoded) return ''
    return value
  } catch { return '' }
}
module.exports = { redactPublicText, publicProvenance, publicProfileUrl }