/**
 * @external {CollectionQuery} https://github.com/Reading-eScience-Centre/coverage-jsapi/blob/master/CoverageCollectionQuery.md
 */

import {COVERAGECOLLECTION} from './constants.js'
import {default as Coverage, transformDomain, transformParameter} from './Coverage.js'
import {shallowcopy, getNamespacePrefixes, DOMAINTYPES_PREFIX} from './util.js'
import {CollectionQuery} from 'covutils'

/**
 * Wraps a CoverageJSON Collection object as a CoverageCollection API object.
 *
 * @see https://github.com/Reading-eScience-Centre/coverage-jsapi
 *
 */
export default class CoverageCollection {
  /**
   * @param {Object} covjson The CoverageJSON Collection document.
   */
  constructor (covjson) {
    /**
     * The constant "CoverageCollection".
     *
     * @type {string}
     */
    this.type = COVERAGECOLLECTION

    /**
     * JSON-LD document
     *
     * @type {Object}
     */
    this.ld = {}

    this._exposeLd(covjson)

    this.prefixes = getNamespacePrefixes(this.ld)

    /**
     * ID of the coverage collection.
     *
     * @type {string|undefined}
     */
    this.id = covjson.id

    let domainType = covjson.domainType
    if (domainType && domainType.indexOf(':') === -1) {
      domainType = DOMAINTYPES_PREFIX + domainType
    }

    /**
     * If defined, every coverage in the collection has the given domain type, typically a URI.
     *
     * @type {string|undefined}
     */
    this.domainType = domainType

    let covs = []
    let rootParams = covjson.parameters ? covjson.parameters : {}
    // generate local parameter IDs if not existing
    // this is to keep track of same parameters when copied into the coverages
    // (e.g. to synchronize legends etc.)
    for (let key of Object.keys(rootParams)) {
      let param = rootParams[key]
      if (!param.id) {
        param.id = Math.round(new Date().getTime() * Math.random()).toString()
      }
    }

    let covOptions = {}
    if (covjson.referencing) {
      covOptions.referencing = covjson.referencing
    }
    for (let coverage of covjson.coverages) {
      if (!coverage.domainType) {
        coverage.domainType = domainType
      }
      if (!coverage.parameters) {
        coverage.parameters = {}
      }
      for (let key of Object.keys(rootParams)) {
        if (key in coverage.ranges) {
          coverage.parameters[key] = rootParams[key]
        }
      }
      if (covjson['@context']) {
        coverage['@context'] = covjson['@context']
      }
      covs.push(new Coverage(coverage, covOptions))
    }

    /**
     * The Coverages of this collection.
     *
     * @type {Array<Coverage>}
     */
    this.coverages = covs
    if (covjson.parameters) {
      /**
       * A Map from key to {@link Parameter} object.
       * The key is a short alias of a {@link Parameter}, typically what is called a "variable name" or similar.
       *
       * @type {Map<string,Parameter>}
       */
      this.parameters = new Map()
      for (let key of Object.keys(covjson.parameters)) {
        transformParameter(covjson.parameters, key)
        this.parameters.set(key, covjson.parameters[key])
      }
    }
  }

  /**
   *
   * @return {CollectionQuery}
   */
  query () {
    return new CollectionQuery(this)
  }

  _exposeLd (covjson) {
    if (!covjson['@context']) {
      // no LD love here...
      return
    }
    // make a deep copy since the object gets modified in-place later
    // but first, remove the coverages (those have their own .ld property)
    let copy = shallowcopy(covjson)
    delete copy.coverages
    this.ld = JSON.parse(JSON.stringify(copy))
  }
}
