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

/**
 * Checks if a media type matches any given media types, ignoring any parameters. 
 * 
 * @param {string} mediaType The media type.
 * @param {string|Array} matchingMediaTypes The media type(s) to match against.
 * @return {bool} True if there is a match.
 */
export function matchesMediaTypes (mediaType, matchingMediaTypes) {
  if (!Array.isArray(matchingMediaTypes)) {
    matchingMediaTypes = [matchingMediaTypes]
  }
  return matchingMediaTypes.some(t => mediaType.indexOf(t) === 0)
}
