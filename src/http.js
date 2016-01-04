import cbor from 'cbor'
import {endsWith} from './util.js'

const MEDIA = {
    COVCBOR: 'application/prs.coverage+cbor',
    COVJSON: 'application/prs.coverage+json',
    JSONLD: 'application/ld+json',
    JSON: 'application/json',
    OCTETSTREAM: 'application/octet-stream',
    TEXT: 'text/plain'
}

const ACCEPT = MEDIA.COVCBOR + '; q=1.0, ' +
               MEDIA.COVJSON + '; q=0.5, ' + 
               MEDIA.JSONLD + '; q=0.1, ' + 
               MEDIA.JSON + '; q=0.1'
               
const EXT = {
    COVJSON: '.covjson',
    COVCBOR: '.covcbor'
}

/**
 * Loads a CoverageJSON document from a given URL and returns a {@link Promise} object
 * that succeeds with the unmodified CoverageJSON object.
 * 
 * @param {string} url
 * @param {object} headers Additional HTTP headers to send
 * @return {Promise}
 *   The result is an object {data, headers} where data is the CoverageJSON object
 *   and headers are the HTTP response headers. The promise fails if the resource at
 *   the given URL is not a valid JSON or CBOR document. 
 */
export function load (url, headers) {
  // TODO implement node version
  throw new Error('node version of http module not implemented yet')
}

