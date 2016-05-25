import {COVERAGECOLLECTION} from './constants.js'
import {default as Coverage, transformDomain, transformParameter} from './Coverage.js'
import {shallowcopy, endsWith, PREFIX} from './util.js'
import {CollectionQuery} from 'covutils/lib/collection/create.js'

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
  constructor(covjson) {
    this.type = COVERAGECOLLECTION
    
    /**
     * JSON-LD document
     * 
     * @type {Object}
     */
    this.ld = {}
    
    this._exposeLd(covjson)
    
    /** 
     * ID of the coverage collection.
     * 
     * @type {string|undefined} 
     */
    this.id = covjson.id
    
    /** @type {Array<string>} */
    this.profiles = []
    
    let profile = covjson.profile
    let domainType
    if (profile) {
      if (profile.substr(0,4) !== 'http') {
        if (endsWith(profile, COVERAGECOLLECTION)) {
          domainType = profile.substr(0, profile.length - COVERAGECOLLECTION.length)
        }
        profile = PREFIX + profile
      }
      this.profiles.push(profile)
    }
    
    if (!domainType) {
      domainType = covjson.domainType
    }
    if (domainType && domainType.substr(0,4) !== 'http') {
      domainType = PREFIX + domainType
    }
    this.domainType = domainType
    
    // backwards-compatibility
    if (!profile && domainType) {
      profile = domainType + COVERAGECOLLECTION
      this.profiles.push(profile)
    }
    
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
      // the Coverage class transforms domainProfile to domainType
      // all the profile stuff should be removed eventually
      if (!coverage.domainProfile) {
        coverage.domainProfile = domainType
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
    
    /** @type {Array<Coverage>} */
    this.coverages = covs
    if (covjson.parameters) {
      /** @type {Map} */
      this.parameters = new Map()
      for (let key of Object.keys(covjson.parameters)) {
        transformParameter(covjson.parameters, key)
        this.parameters.set(key, covjson.parameters[key])
      }
    }
    if (covjson.domainTemplate) {
      transformDomain(covjson.domainTemplate)
      this.domainTemplate = covjson.domainTemplate
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
