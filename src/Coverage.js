import ndarray from 'ndarray'

import {subsetCoverageByValue, subsetDomainByIndex, normalizeIndexSubsetConstraints} from 'covutils/lib/subset.js'
import {minMax} from 'covutils/lib/array.js'

import {COVERAGE} from './constants.js'
import {shallowcopy, assert, PREFIX} from './util.js'

  
  
//NO FILE EXTENSION, to work around JSPM bug in handling package.json's "browser" field
//see https://github.com/jspm/jspm-cli/issues/1062#issuecomment-170342414
import {load} from './http'

/** 
 * Wraps a CoverageJSON Coverage object as a Coverage API object.
 * 
 * @see https://github.com/Reading-eScience-Centre/coverage-jsapi
 * 
 */
export default class Coverage {
  
  /**
   * @param {Object} covjson A CoverageJSON Coverage object.
   * @param {Object} [options] 
   * @param {boolean} [options.cacheRanges]
   *   If true, then any range that was loaded remotely is cached.
   *   (The domain is always cached.)
   * @param {Array} [options.referencing]
   *   Referencing info to use (e.g. from containing collection).                        
   */
  constructor (covjson, options) {
    this._covjson = covjson
    
    this.type = COVERAGE
    
    /**
     * JSON-LD document
     * 
     * @type {Object}
     */
    this.ld = {}
    
    this._exposeLd(covjson)
    
    /**
     * The options object that was passed in to the constructor. 
     * 
     * @type {Object} 
     */
    this.options = options ? shallowcopy(options) : {}
    
    /** 
     * ID of the coverage.
     * 
     * @type {string|undefined} 
     */
    this.id = covjson.id
    
    /** @type {Map} */
    this.parameters = new Map()
    for (let key of Object.keys(covjson.parameters)) {
      transformParameter(covjson.parameters, key)
      this.parameters.set(key, covjson.parameters[key])
    }
    
    /** @type {Array<string>} */
    this.profiles = []
    
    let profile = this._covjson.profile
    if (profile) {
      if (profile.substr(0,4) !== 'http') {
        profile = PREFIX + profile
      }
      this.profiles.push(profile)
    }
    
    // TODO remove .domainProfiles in favour of .domainType at some point
    /** @type {Array<string>} */
    this.domainProfiles = []
    
    let domainProfile
    if (typeof this._covjson.domain === 'string') {
      domainProfile = this._covjson.domainProfile
    } else {
      domainProfile = this._covjson.domain.profile
    }

    if (domainProfile) {
      if (domainProfile.substr(0,4) !== 'http') {
        domainProfile = PREFIX + domainProfile
      }
      this.domainType = domainProfile
      this.domainProfiles.push(domainProfile)
    }
    
    // backwards-compatibility
    if (!profile && domainProfile) {
      profile = domainProfile + COVERAGE
      this.profiles.push(profile)
    }
    
    this._updateLoadStatus()
  }
  
  _updateLoadStatus () {
    let isLoaded = prop => typeof prop === 'object' 
    let domainLoaded = isLoaded(this._covjson.domain)
    let rangesLoaded = Object.keys(this._covjson.ranges).every(key => isLoaded(this._covjson.ranges[key]))
    this.loaded = domainLoaded && rangesLoaded
  }
  
  _exposeLd (covjson) {
    if (!covjson['@context']) {
      // no LD love here...
      return
    }
    // make a deep copy since the object gets modified in-place later
    // but first, remove domain and range which may be embedded
    let copy = shallowcopy(covjson)
    delete copy.domain
    delete copy.ranges
    this.ld = JSON.parse(JSON.stringify(copy))
  }
    
  /**
   * Returns a Promise succeeding with the domain data.
   * 
   * @return {Promise}
   */
  loadDomain () {
    let domainOrUrl = this._covjson.domain
    if (this._domainPromise) return this._domainPromise
    let promise
    if (typeof domainOrUrl === 'object') {
      let domain = domainOrUrl
      transformDomain(domain, this.options.referencing, this.domainType)
      promise = Promise.resolve(domain)
    } else {
      let url = domainOrUrl
      promise = load(url).then(result => {
        let domain = result.data
        transformDomain(domain, this.options.referencing, this.domainType)
        this._covjson.domain = domain
        this._updateLoadStatus()
        return domain
      })
    }
    /* The promise gets cached so that the domain is not loaded twice remotely.
     * This might otherwise happen when loadDomain and loadRange is used
     * with Promise.all(). Remember that loadRange also invokes loadDomain.
     */ 
    this._domainPromise = promise
    return promise
  }
  
  /**
   * Returns a Promise succeeding with the requested range data.
   * 
   * Note that this method implicitly loads the domain as well. 
   * 
   * @example
   * cov.loadRange('salinity').then(function (sal) {
   *   // work with Range object
   * }).catch(function (e) {
   *   // there was an error when loading the range
   *   console.log(e.message)
   * }) 
   * @param {string} paramKey The key of the Parameter for which to load the range.
   * @return {Promise} A Promise object which loads the requested range data and succeeds with a Range object.
   */
  loadRange (paramKey) {
    // Since the shape of the range array is derived from the domain, it has to be loaded as well.
    return this.loadDomain().then(domain => {
      let rangeOrUrl = this._covjson.ranges[paramKey]
      if (typeof rangeOrUrl === 'object') {
        let range = rangeOrUrl
        transformRange(range, domain)
        return Promise.resolve(range)
      } else {
        let url = rangeOrUrl
        return load(url).then(result => {
          let range = result.data
          transformRange(range, domain)
          if (this.options.cacheRanges) {
            this._covjson.ranges[paramKey] = range
            this._updateLoadStatus()
          }
          return range
        })
      }
    })    
  }
  
  /**
   * Returns the requested range data as a Promise.
   * 
   * Note that this method implicitly loads the domain as well. 
   * 
   * @example
   * cov.loadRanges(['salinity','temp']).then(function (ranges) {
   *   // work with Map object
   *   console.log(ranges.get('salinity').values)
   * }).catch(function (e) {
   *   // there was an error when loading the range data
   *   console.log(e)
   * }) 
   * @param {iterable<string>} [paramKeys] An iterable of parameter keys for which to load the range data. If not given, loads all range data.
   * @return {Promise} A Promise object which loads the requested range data and succeeds with a Map object.
   */
  loadRanges (paramKeys) {
    if (paramKeys === undefined) paramKeys = this.parameters.keys()
    paramKeys = Array.from(paramKeys)
    return Promise.all(paramKeys.map(k => this.loadRange(k))).then(ranges => {
      let map = new Map()
      for (let i=0; i < paramKeys.length; i++) {
        map.set(paramKeys[i], ranges[i])
      }
      return map
    })
  }
  
  /**
   * Returns a Promise object which provides a copy of this Coverage object
   * with the domain subsetted by the given indices specification.
   * 
   * Note that the coverage type and/or domain type of the resulting coverage
   * may be different than in the original coverage.
   * 
   * Note that the subsetted ranges are a view over the original ranges, meaning
   * that no copying is done but also no memory is released if the original
   * coverage is garbage collected.
   * 
   * @example
   * cov.subsetByIndex({t: 4, z: {start: 10, stop: 20} }).then(function(subsetCov) {
   *   // work with subsetted coverage
   * })
   * @param {Object} constraints An object which describes the subsetting constraints.
   *   Every property of it refers to an axis name as defined in Domain.names,
   *   and its value must either be an integer
   *   or an object with start, stop, and optionally step (defaults to 1) properties
   *   whose values are integers.
   *   Properties that have the values undefined or null are ignored. 
   *   All integers must be non-negative, step must not be zero.
   *   An integer constrains the axis to the given index,
   *   a start/stop/step object to a range of indices:
   *   If step=1, this includes all indices starting at start and ending at stop (exclusive);
   *   if step>1, all indices start, start + step, ..., start + (q + r - 1) step where 
   *   q and r are the quotient and remainder obtained by dividing stop - start by step.
   * @returns {Promise} A Promise object with the subsetted coverage object as result.
   */
  subsetByIndex (constraints) {
    return subsetByIndex(this, constraints)
  }
  
  /**
   * Returns a Promise object which provides a copy of this Coverage object
   * with the domain subsetted by the given value specification.
   * 
   * Note that the coverage type and/or domain type of the resulting coverage
   * may be different than in the original coverage.
   * 
   * Note that the subsetted ranges are a view over the original ranges, meaning
   * that no copying is done but also no memory is released if the original
   * coverage is garbage collected.
   * 
   * @example
   * cov.subsetByValue({
   *   t: '2015-01-01T01:00:00',
   *   z: {start: -10, stop: -5} 
   * }).then(function(subsetCov) {
   *   // work with subsetted coverage
   * })
   * @example
   * cov.subsetByValue({z: {target: -10} }).then(function(subsetCov) {
   *   // work with subsetted coverage
   * }
   * @param {Object} constraints An object which describes the subsetting constraints.
   *  Every property of it refers to an axis name as defined in Domain.names,
   *  and its value must either be a number or string, or,
   *  if the axis has an ordering relation, an object with start and stop properties
   *  whose values are numbers or strings, or an object with a target property
   *  whose value is a number or string.
   *  Properties that have the values undefined or null are ignored.
   *  A number or string constrains the axis to exactly the given value,
   *  a start/stop object to the values intersecting the extent,
   *  and a target object to the value closest to the given value.
   * @returns {Promise} A Promise object with the subsetted coverage object as result.
   */
  subsetByValue (constraints) {
    return subsetCoverageByValue(this, constraints)
  }
}

function getRangeAxisOrder (domain, range) {
  // backwards-compatibility, in the future the range always has an explicit axis ordering
  let needsRangeAxisOrder = [...domain.axes.values()].filter(axis => axis.values.length > 1).length > 1
  
  // domain is checked for backwards-compatibility
  let axisOrder = domain._rangeAxisOrder || range._axisNames
  if (needsRangeAxisOrder && !axisOrder) {
    throw new Error('Range axis order missing')
  }
  axisOrder = axisOrder || [...domain.axes.keys()]
  return axisOrder
}

function getRangeShapeArray (domain, range) {
  // mostly backwards-compatibility, in the future this just returns range._shape
  let axisOrder = getRangeAxisOrder(domain, range)
  let shape = axisOrder.map(k => domain.axes.get(k).values.length)
  if (range._shape) {
    let matchesDomain = range._shape.length === shape.length && range._shape.every((v,i) => v === shape[i])
    if (!matchesDomain) {
      throw new Error('range.shape must match domain axis sizes')
    }
  }
  return shape
}

function subsetByIndex (cov, constraints) {
  return cov.loadDomain().then(domain => {
    constraints = normalizeIndexSubsetConstraints(domain, constraints)
    let newdomain = subsetDomainByIndex(domain, constraints)
    
    // backwards-compatibility
    if (domain._rangeAxisOrder) {
      newdomain._rangeAxisOrder = domain._rangeAxisOrder
    }
          
    // subset the ndarrays of the ranges (on request)
    let rangeWrapper = range => {
      let ndarr = range._ndarr
            
      // fast ndarray view
      let axisNames = getRangeAxisOrder(domain, range)
      let los = axisNames.map(name => constraints[name].start)
      let his = axisNames.map(name => constraints[name].stop)
      let steps = axisNames.map(name => constraints[name].step)
      let newndarr = ndarr.hi(...his).lo(...los).step(...steps)
      
      let newrange = {
        dataType: range.dataType,
        get: createRangeGetFunction(newndarr, axisNames),
        _ndarr: newndarr,
        _axisNames: axisNames,
        _shape: axisNames.map(axisName => newdomain.axes.get(axisName).values.length)
      }
      newrange.shape = new Map()
      for (let axisName of axisNames) {
        let size = newdomain.axes.get(axisName).values.length
        newrange.shape.set(axisName, size)
      }
      return newrange
    }
    
    let loadRange = key => cov.loadRange(key).then(rangeWrapper)
    
    let loadRanges = keys => cov.loadRanges(keys).then(ranges => 
      new Map([...ranges].map(([key, range]) => [key, rangeWrapper(range)]))
    )
    
    // assemble everything to a new coverage
    let newcov = {
      type: COVERAGE,
      // TODO are the profiles still valid?
      domainProfiles: cov.domainProfiles,
      domainType: cov.domainType,
      parameters: cov.parameters,
      loadDomain: () => Promise.resolve(newdomain),
      loadRange,
      loadRanges
    }
    newcov.subsetByIndex = subsetByIndex.bind(null, newcov)
    newcov.subsetByValue = subsetCoverageByValue.bind(null, newcov)
    return newcov
  })
}

/**
 * Currently unused, but may need in future.
 * This determines the best array type for categorical data which
 * doesn't have missing values.
 */
/*
function arrayType (validMin, validMax) {
  let type
  if (validMin !== undefined) {
    if (validMin >= 0) {
      if (validMax < Math.pow(2,8)) {
        type = Uint8Array
      } else if (validMax < Math.pow(2,16)) {
        type = Uint16Array
      } else if (validMax < Math.pow(2,32)) {
        type = Uint32Array
      } else {
        type = Array
      }
    } else {
      let max = Math.max(Math.abs(validMin), validMax)
      if (max < Math.pow(2,8)) {
        type = Int8Array
      } else if (validMax < Math.pow(2,16)) {
        type = Int16Array
      } else if (validMax < Math.pow(2,32)) {
        type = Int32Array
      } else {
        type = Array
      }
    }
  } else {
    type = Array
  }
  return type
}
*/

/**
 * Transforms a CoverageJSON parameter to the Coverage API format, that is,
 * some elements are converted from objects to Maps. Transformation is made in-place.
 * 
 * @param {Object} param The original parameter.
 * @access private
 */
export function transformParameter (params, key) {
  if ('__transformDone' in params[key]) return
  let param = params[key]
  param.key = key
  if (param.unit) {
    if (typeof param.unit.symbol === 'string') {
      param.unit.symbol = {
        value: param.unit.symbol
        // no type member, since the scheme is unknown
      }
    }
  }
  if (param.categoryEncoding) {
    let map = new Map()
    for (let category of Object.keys(param.categoryEncoding)) {
      let vals = param.categoryEncoding[category]
      if (!Array.isArray(vals)) {
        vals = [vals]
      }
      map.set(category, vals)
    }
    param.categoryEncoding = map
  }
  param.__transformDone = true  
}

/**
 * Transforms a CoverageJSON range to the Coverage API format, that is,
 * no special encoding etc. is left. Transformation is made in-place.
 * 
 * @param {Object} range The original range.
 * @param {Object} domain The CoverageJSON domain object. 
 * @return {Object} The transformed range.
 */
function transformRange (range, domain) {
  if ('__transformDone' in range) return
  
  const values = range.values
  const targetDataType = range.dataType // 'integer', 'float', 'string'
  const isTyped = ArrayBuffer.isView(values)
  const missingIsEncoded = typeof range.validMin === 'number'
  const hasOffsetFactor = 'offset' in range

  if ('offset' in range) {
    assert('factor' in range)
  }
  const offset = range.offset
  const factor = range.factor
  
  if (missingIsEncoded) {
    assert('validMin' in range)
    assert('validMax' in range)
  }
  const validMin = range.validMin
  const validMax = range.validMax
  
  let vals
  if (!missingIsEncoded && !hasOffsetFactor) {
    // No transformation necessary.
    vals = values
  } else {
    // Transformation is necessary.
    // we use a regular array so that missing values can be represented as null
    vals = new Array(values.length)
    
    // TODO can we use typed arrays here without having to scan for missing values first?
    //  When typed arrays with missing value encoding was used we could keep that and provide
    //  a higher abstraction on the array similar to an ndarray interface. This means that [] syntax
    //  would be impossible and change to .get(index).
    
    if (hasOffsetFactor) {
      for (let i=0; i < values.length; i++) {
        const val = values[i]
        if (missingIsEncoded && (val < validMin || val > validMax)) {
          // This is necessary as the default value is "undefined".
          vals[i] = null
        } else if (!missingIsEncoded && val === null) {
          vals[i] = null
        } else {
          vals[i] = val * factor + offset
        }
      }
      
      if (validMin !== undefined) {
        range.validMin = validMin * factor + offset
        range.validMax = validMax * factor + offset
      }
    } else { // missingIsEncoded == true
      for (let i=0; i < values.length; i++) {
        const val = values[i]
        if (val < validMin || val > validMax) {
          vals[i] = null
        } else {
          vals[i] = val
        }
      }
    }
        
    delete range.offset
    delete range.factor
    delete range.validMin
    delete range.validMax
  }
  
  if (range.actualMin === undefined) {
    let [min,max] = minMax(vals)
    if (min !== null) {
      range.actualMin = min
      range.actualMax = max
    }
  }
  
  // store the array as we will expose a Map on range.shape in the next step
  if (range.shape) {
    range._shape = range.shape
  }
  if (range.axisNames) {
    // not part of public API
    range._axisNames = range.axisNames
    delete range.axisNames
  }
  
  let axisNames = getRangeAxisOrder(domain, range)
  let shapeArr = getRangeShapeArray(domain, range)
  
  let ndarr = ndarray(vals, shapeArr)
  range._ndarr = ndarr
  range.get = createRangeGetFunction(ndarr, axisNames)
  
  let shapeMap = new Map()
  for (let [axisName, axis] of domain.axes) {
    shapeMap.set(axisName, axis.values.length)
  }  
  range.shape = shapeMap
  
  range.__transformDone = true  
  return range
}

/**
 * 
 * @param axisOrder An array of axis names.
 * @returns Function
 */
function createRangeGetFunction (ndarr, axisOrder) {
  // see below for slower reference version
  let ndargs = ''
  for (let i=0; i < axisOrder.length; i++) {
    if (ndargs) ndargs += ','
    ndargs += `'${axisOrder[i]}' in obj ? obj['${axisOrder[i]}'] : 0`
  }
  let fn = new Function('ndarr', `return function ndarrget (obj) { return ndarr.get(${ndargs}) }`)(ndarr)
  return fn
}

/*
 * Reference version of createRangeGetFunction().
 * Around 50% slower (on Chrome 46) compared to precompiled version.
 * 
function createRangeGetFunction (ndarr, axisOrder) {
  axisOrder = axisOrder.slice() // help the JIT (possibly..)
  const axisCount = axisOrder.length
  return obj => {
    let indices = new Array(axisCount)
    for (let i=0; i < axisCount; i++) {
      indices[i] = axisOrder[i] in obj ? obj[axisOrder[i]] : 0
    }
    return ndarr.get(...indices)
  }
}
*/

/**
 * Transforms a CoverageJSON domain to the Coverage API format.
 * Transformation is made in-place.
 * 
 * @param {Object} domain The original domain object.
 * @param {Array} [referencing] Referencing info to inject.
 * @return {Object} The transformed domain object.
 * @access private
 */
export function transformDomain (domain, referencing, domainType) {
  if ('__transformDone' in domain) return
  
  // TODO remove .profiles in favour .domainType at some point
  domain.profiles = []
  let profile = domain.profile
  if (profile) {
    if (profile.substr(0,4) !== 'http') {
      profile = PREFIX + profile
    }
    domain.domainType = profile
    domain.profiles.push(profile)
  }
  if (!domain.domainType) {
    domain.domainType = domainType
  }

  let axes = new Map() // axis name -> axis object
  
  for (let axisName of Object.keys(domain.axes)) {
    axes.set(axisName, domain.axes[axisName])
  }
  domain.axes = axes
  
  // expand start/stop/num regular axes
  // replace 1D numeric axis arrays with typed arrays for efficiency
  for (let [key, axis] of axes) {
    axis.key = key
    
    if (axis.dataType === 'Tuple' || axis.dataType === 'Polygon') {
      axis.dataType = PREFIX + axis.dataType
    }
    
    // TODO remove this if-block later, just here for backwards-compatibility 
    if (axis.dimensions) {
      axis.components = axis.dimensions
    }
    
    if (!axis.components) {
      axis.components = [key]
    }
    
    // TODO remove this line later, just here for backwards-compatibility 
    axis.dimensions = axis.components
    
    
    if ('start' in axis && 'stop' in axis && 'num' in axis) {
      let arr = new Float64Array(axis.num)
      let step
      if (axis.num === 1) {
        if (axis.start !== axis.stop) {
          throw new Error('regular axis of length 1 must have equal start/stop values')
        }
        step = 0
      } else {
        step = (axis.stop - axis.start) / (axis.num - 1)
      }
      for (let i=0; i < axis.num; i++) {
        arr[i] = axis.start + i * step
      }
      
      axis.values = arr
      delete axis.start
      delete axis.stop
      delete axis.num
    }
    
    if (ArrayBuffer.isView(axis.values)) {
      // already a typed array
      continue
    }
    if (Array.isArray(axis.values) && typeof axis.values[0] === 'number') {
      let arr = new Float64Array(axis.values.length)
      for (let i=0; i < axis.values.length; i++) {
        arr[i] = axis.values[i]
      }
      axis.values = arr
    }
    
    axis.bounds = wrapBounds(axis)
  }
  
  if (referencing) {
    domain.referencing = referencing
  }
  
  // TODO remove this later, just here for backwards-compatibility 
  for (let obj of domain.referencing) {
    if (obj.system) break // already transformed
    obj.system = obj.srs || obj.trs || obj.rs
    if (obj.dimensions) {
      obj.components = obj.dimensions
    }
    delete obj.srs
    delete obj.trs
    delete obj.rs
  }
  
  if (domain.rangeAxisOrder) {
    domain._rangeAxisOrder = domain.rangeAxisOrder
    delete domain.rangeAxisOrder
  }
  
  domain.__transformDone = true
  
  return domain
}

function wrapBounds (axis) {
  if (axis.bounds) {
    let bounds = axis.bounds
    return {
      get: i => [bounds[2*i], bounds[2*i + 1]]
    }
  }
}
