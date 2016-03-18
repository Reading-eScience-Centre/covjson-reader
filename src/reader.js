import Coverage from './Coverage.js'
import CoverageCollection from './CoverageCollection.js'
import {assert} from './util.js'

// NO FILE EXTENSION, to work around JSPM bug in handling package.json's "browser" field
// see https://github.com/jspm/jspm-cli/issues/1062#issuecomment-170342414
import * as http from './http'

/**
 * Loads a CoverageJSON document from a given URL and returns a {@link Promise} object
 * that succeeds with the unmodified CoverageJSON object.
 * 
 * @param {string} url
 * @param {Object} headers Additional HTTP headers to send
 * @return {Promise}
 *   A Promise succeeding with an object <code>{data, headers}</code> where data is the CoverageJSON object
 *   and headers are the HTTP response headers with lower-cased header names as object keys.
 *   The promise fails if the resource at the given URL is not a valid JSON or CBOR document. 
 */
export function load (url, headers) {
  return http.load(url, headers)
}

/**
 * Reads a CoverageJSON document and returns a {@link Promise} that succeeds with
 * a {@link Coverage} or {@link CoverageCollection} object.
 * 
 * Note that if the document references external domain or range documents,
 * then these are not loaded immediately. 
 * 
 * 
 * @example
 * CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
 *   // work with Coverage object
 * }).catch(function (e) {
 *   // there was an error when loading the coverage
 *   console.log(e)
 * })
 * @param {Object|string} input
 *    Either a URL pointing to a CoverageJSON Coverage or Coverage Collection document
 *    or a CoverageJSON Coverage or Coverage Collection object.
 * @param {Object} [options]
 *   An options object. 
 * @param {Object} [options.headers]
 *   Additional HTTP headers to send if input is a URL.
 * @return {Promise} 
 *    A promise object succeeding with a {@link Coverage} or {@link CoverageCollection} object,
 *    and failing with an {@link Error} object.
 */
export function read (input, options) {
  options = options || {}
  let headers = options.headers || {}
  if (typeof input === 'object') {
    return Promise.resolve().then(() => transformCovJSON(input))
  } else {
    // it's a URL, load it
    return load(input, headers).then(({data,headers}) => 
      transformCovJSON(data, headers))
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
  if (obj.type !== 'Coverage' && obj.type !== 'CoverageCollection') {
    throw new Error('CoverageJSON document must be of Coverage or CoverageCollection type')
  }
  
  let result
  if (obj.type === 'Coverage') {
    result = new Coverage(obj)
  } else {
    result = new CoverageCollection(obj)
  }
  
  addLinkRelations(result, headers)
    
  return result
}

/**
 * Scans the supplied HTTP headers for Link relations and adds them
 * to the .ld property of the Coverage/CoverageCollection.
 */    
function addLinkRelations (cov, headers) {
  // for registered rel's
  const IANAPrefix = 'http://www.iana.org/assignments/relation/'
  
  if (!headers || !headers['link']) {
    return
  }
  
  let ld = cov.ld
  
  for (let link of headers['link'].split(',')) {
    link = link.trim()
    // FIXME this will fail if the URL contains a ";" which is valid (see RFC5988)
    let parts = link.split(';')
    let url = parts[0].substr(1, parts[0].length-2)
    for (let param of parts.slice(1)) {
      let relStart = param.indexOf('rel=')
      if (relStart === -1) {
        continue
      }
      let rel = param.substring(relStart+5, param.length-1)
      if (!rel.startsWith('http://') && !rel.startsWith('https://')) {
        rel = IANAPrefix + rel
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
  if (obj.type === 'Coverage') {
    assert('parameters' in obj, '"parameters" missing')
    assert('domain' in obj, '"domain" missing')
    assert('ranges' in obj, '"ranges" missing')
  } else if (obj.type === 'CoverageCollection') {
    assert(Array.isArray(obj.coverages), '"coverages" must be an array')
  }
}
