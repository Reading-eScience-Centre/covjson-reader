import Coverage from './Coverage.js'
import CoverageCollection from './CoverageCollection.js'
import {endsWith, assert} from './util.js'
import {load} from './ajax.js'

export {load} from './ajax.js'


/**
 * Reads a CoverageJSON document and returns a {@link Promise} that succeeds with
 * a {@link Coverage} or {@link CoverageCollection} object.
 * 
 * Note that if the document references external domain or range documents,
 * then these are not loaded immediately. 
 * 
 * 
 * @example <caption>ES6 module</caption>
 * read('http://example.com/coverage.covjson').then(cov => {
 *   // work with Coverage object
 * }).catch(e => {
 *   // there was an error when loading the coverage
 *   console.log(e)
 * })
 * @example <caption>ES5 global</caption>
 * CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
 *   // work with Coverage object
 * }).catch(function (e) {
 *   // there was an error when loading the coverage
 *   console.log(e)
 * })
 * @param {Object|string} input 
 *    Either a URL pointing to a CoverageJSON Coverage or Coverage Collection document
 *    or a CoverageJSON Coverage or Coverage Collection object.
 * @return {Promise} 
 *    A promise object having a {@link Coverage} or {@link CoverageCollection} object as result.
 *    In the error case, an {@link Error} object is supplied from the {@link Promise}.
 */
export function read (input) {
  if (typeof input === 'object') {
    return new Promise(resolve => resolve(transformCovJSON(input)))
  } else {
    // it's a URL, load it
    return load(input).then(transformCovJSON)
  }
}

/**
 * Transforms a CoverageJSON object into one or more Coverage objects.
 *  
 * @param obj A CoverageJSON object of type Coverage or CoverageCollection.
 * @return {Coverage|Array of Coverage}
 */
function transformCovJSON (obj) {
  checkValidCovJSON(obj)
  if (!endsWith(obj.type, 'Coverage') && obj.type !== 'CoverageCollection') {
    throw new Error('CoverageJSON document must be of *Coverage or CoverageCollection type')
  }
  
  let result
  if (endsWith(obj.type, 'Coverage')) {
    result = new Coverage(obj)
  } else {
    result = new CoverageCollection(obj)
  }
    
  return result
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
  if (endsWith(obj.type, 'Coverage')) {
    assert('parameters' in obj, '"parameters" missing')
    assert('domain' in obj, '"domain" missing')
    assert('ranges' in obj, '"ranges" missing')
  } else if (obj.type === 'CoverageCollection') {
    assert(Array.isArray(obj.coverages), '"coverages" must be an array')
  }
}
