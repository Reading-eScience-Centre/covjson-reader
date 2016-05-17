import {COVERAGECOLLECTION} from './constants.js'
import {default as Coverage, transformDomain, transformParameter} from './Coverage.js'
import {shallowcopy, asTime, endsWith, PREFIX} from './util.js'
import {isISODateAxis, isLongitudeAxis, getLongitudeWrapper} from 'covutils/lib/domain/referencing.js'

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

export class CollectionQuery {
  /**
   * @param {CoverageCollection} collection
   */
  constructor (collection) {
    this._collection = collection
    this._filter = {}
    this._subset = {}
  }
  
  /**
   * Matching mode: intersect
   * 
   * Supports ISO8601 date string axes.
   * All other string-type axes are compared alphabetically.
   * 
   * @example
   * collection.query().filter({
   *   't': {start: '2015-01-01T01:00:00', stop: '2015-01-01T02:00:00'}
   * }).execute().then(filteredCollection => {
   *   console.log(filteredCollection.coverages.length)
   * })
   * @param {Object} spec
   * @return {CollectionQuery}
   */
  filter (spec) {
    mergeInto(spec, this._filter)
    return this
  }
  
  /**
   * Subset coverages by domain values.
   * 
   * Equivalent to calling {@link Coverage.subsetByValue}(spec) on each
   * coverage in the collection.
   * 
   * @param {Object} spec
   * @return {CollectionQuery}
   */
  subset (spec) {
    mergeInto(spec, this._subset)
    return this
  }
  
  /**
   * This query operation is not supported and has no effect.
   * 
   * @return {CollectionQuery}
   */
  embed (spec) {
    return this
  }
  
  /**
   * Applies the query operators and returns
   * a Promise that succeeds with a new CoverageCollection.
   * 
   * @return {Promise<CoverageCollection>}
   */
  execute () {
    let coll = this._collection
    let newcoll = {
      type: COVERAGECOLLECTION,
      coverages: [],
      parameters: coll.parameters,
      // TODO is the domain template still valid in all cases after filtering and subsetting?
      domainTemplate: coll.domainTemplate,
      // TODO are the profiles still valid?
      profiles: coll.profiles
    }
    
    let promises = []
    for (let cov of coll.coverages) {
      promises.push(cov.loadDomain().then(domain => {
        if (!matchesFilter(domain, this._filter)) {
          return
        }
        
        if (Object.keys(this._subset).length === 0) {
          newcoll.coverages.push(cov)
        } else {
          return cov.subsetByValue(this._subset).then(subsetted => {
            newcoll.coverages.push(subsetted)
          })
        }
      }))
    }
    return Promise.all(promises).then(() => {
      newcoll.query = () => new CollectionQuery(newcoll)
      return newcoll
    })
  }
}

function matchesFilter (domain, filter) {
  for (let axisName of Object.keys(filter)) {
    let condition = filter[axisName]
    if (!domain.axes.has(axisName)) {
      throw new Error('Axis "' + axisName + '" does not exist')
    }
    let axis = domain.axes.get(axisName)
    let vals = axis.values
    
    let [min,max] = [vals[0],vals[vals.length-1]]
    if (typeof min !== 'number' && typeof min !== 'string') {
      throw new Error('Can only filter primitive axis values')
    }
    let {start,stop} = condition
    
    // special handling
    if (isISODateAxis(domain, axisName)) {
      [min,max] = [asTime(min), asTime(max)]
      [start,stop] = [asTime(start), asTime(stop)]
    } else if (isLongitudeAxis(domain, axisName)) {
      let lonWrapper = getLongitudeWrapper(domain, axisName)
      [start,stop] = [lonWrapper(start), lonWrapper(stop)]
    }
    
    if (min > max) {
      [min,max] = [max,min]
    }
    if (max < start || stop < min) {
      return false
    }
  }
  
  return true
}

function mergeInto (inputObj, targetObj) {
  for (let k of Object.keys(inputObj)) {
    targetObj[k] = inputObj[k]
  }
}
