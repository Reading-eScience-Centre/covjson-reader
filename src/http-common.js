export const MEDIATYPE = {
  COVJSON: 'application/prs.coverage+json',
  JSONLD: 'application/ld+json',
  JSON: 'application/json',
  TEXT: 'text/plain'
}

export const EXT = {
  COVJSON: '.covjson'
}

import {CORE_PREFIX} from './util.js'
export const COVJSON_PROFILE_STANDALONE = CORE_PREFIX + 'standalone'

/**
 * Returns an Accept header value for requesting CoverageJSON documents.
 *
 * @param {bool} standalone Whether to include the standalone profile of CoverageJSON or not.
 */
export function getAcceptHeader (standalone) {
  let covjsonProfile = standalone ? '; profile="' + COVJSON_PROFILE_STANDALONE + '"' : ''
  let accept =
    MEDIATYPE.COVJSON + covjsonProfile + '; q=1.0, ' +
    MEDIATYPE.JSONLD + '; q=0.1, ' +
    MEDIATYPE.JSON + '; q=0.1'
  return accept
}
