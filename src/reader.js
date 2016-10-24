import {default as Coverage, transformDomain} from './Coverage.js'
import CoverageCollection from './CoverageCollection.js'
import {assert} from './util.js'
import {COVERAGE, COVERAGECOLLECTION, DOMAIN, LINKRELPREFIX} from './constants.js'
import * as http from './http.js'

/**
 * Loads a CoverageJSON document from a given URL and returns a {@link Promise} object
 * that succeeds with the unmodified CoverageJSON object.
 *
 * @param {string} url The URL to load the CoverageJSON document from.
 * @param {Object} [options] An options object.
 * @param {Object} [options.headers] Additional HTTP headers to send if input is a URL.
 * @param {Object} [options.eagerload]
 *   Request a stand-alone CoverageJSON document (with domain and ranges embedded) if input is a URL.
 *   Note that the server may ignore that preference.
 * @return {Promise}
 *   A Promise succeeding with an object <code>{data, headers}</code> where data is the CoverageJSON object
 *   and headers are the HTTP response headers with lower-cased header names as object keys.
 *   The promise fails if the resource at the given URL is not a valid JSON or CBOR document.
 */
export function load (url, options) {
  return http.load(url, options)
}

/**
 * Reads a CoverageJSON document and returns a {@link Promise} that succeeds with
 * a Domain, {@link Coverage}, or {@link CoverageCollection} object.
 *
 * Note that if the document references external domain or range documents,
 * then these are not loaded immediately.
 *
 *
 * @example
 * CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
 *   // work with Coverage data object
 * }).catch(function (e) {
 *   // there was an error when loading the coverage data
 *   console.log(e)
 * })
 * @param {Object|string} input
 *    A CoverageJSON Domain, Coverage, or Coverage Collection document, as URL or object.
 * @param {Object} [options]
 *   An options object.
 * @param {Object} [options.headers]
 *   Additional HTTP headers to send if input is a URL.
 * @param {Object} [options.eagerload]
 *   Request a stand-alone CoverageJSON document (with domain and ranges embedded) if input is a URL.
 *   Note that the server may ignore that preference.
 * @return {Promise}
 *    A promise object succeeding with a Domain, {@link Coverage}, or {@link CoverageCollection} object,
 *    and failing with an {@link Error} object.
 */
export function read (input, options = {}) {
  if (typeof input === 'object') {
    return Promise.resolve().then(() => transformCovJSON(input))
  } else {
    return load(input, options).then(({data, headers}) => transformCovJSON(data, headers))
  }
}

/**
 * Transforms a CoverageJSON object into one or more Coverage objects.
 *
 * @param {object} obj A CoverageJSON object of type Coverage or CoverageCollection.
 * @param {array} headers An optional array of HTTP headers. Keys are lower-cased header names.
 * @return {Coverage|Array of Coverage}
 */
function transformCovJSON (obj, headers) {
  checkValidCovJSON(obj)
  if ([COVERAGE, COVERAGECOLLECTION, DOMAIN].indexOf(obj.type) === -1) {
    throw new Error('CoverageJSON document must be of Coverage, CoverageCollection, or Domain type')
  }

  let result
  if (obj.type === DOMAIN) {
    transformDomain(obj)
    result = obj
  } else if (obj.type === COVERAGE) {
    result = new Coverage(obj)
  } else {
    result = new CoverageCollection(obj)
  }

  if (obj.type === COVERAGE || obj.type === COVERAGECOLLECTION) {
    addLinkRelations(result, headers)
  }

  return result
}

/**
 * Scans the supplied HTTP headers for Link relations and adds them
 * to the .ld property of the Coverage/CoverageCollection.
 */
function addLinkRelations (cov, headers) {
  if (!headers || !headers['link']) {
    return
  }

  let ld = cov.ld

  for (let link of headers['link'].split(',')) {
    link = link.trim()
    // FIXME this will fail if the URL contains a ";" which is valid (see RFC5988)
    let parts = link.split(';')
    let url = parts[0].substr(1, parts[0].length - 2)
    for (let param of parts.slice(1)) {
      let relStart = param.indexOf('rel=')
      if (relStart === -1) {
        continue
      }
      let rel = param.substring(relStart + 5, param.length - 1)
      if (rel.indexOf('http://') !== 0 && rel.indexOf('https://') !== 0) {
        rel = LINKRELPREFIX + rel
      }
      if (ld[rel]) {
        if (Array.isArray(ld[rel])) {
          ld[rel].push(url)
        } else {
          ld[rel] = [ld[rel], url]
        }
      } else {
        ld[rel] = url
      }
    }
  }
}

/**
 * Performs basic structural checks to validate whether a given object is a CoverageJSON object.
 *
 * Note that this method is not comprehensive and should not be used for checking
 * whether an object fully conforms to the CoverageJSON specification.
 *
 * @param obj
 * @throws {Error} when obj is not a valid CoverageJSON document
 */
function checkValidCovJSON (obj) {
  assert('type' in obj, '"type" missing')
  if (obj.type === COVERAGE) {
    assert('parameters' in obj, '"parameters" missing')
    assert('domain' in obj, '"domain" missing')
    assert('ranges' in obj, '"ranges" missing')
  } else if (obj.type === COVERAGECOLLECTION) {
    assert(Array.isArray(obj.coverages), '"coverages" must be an array')
  }
}
