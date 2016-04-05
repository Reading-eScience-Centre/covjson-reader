import ndarray from 'ndarray'

import {COVERAGE, DOMAIN} from './constants.js'
import {shallowcopy, minMax, assert, asTime,
  indexOfNearest, indicesOfNearest, PREFIX} from './util.js'
import {isISODateAxis, isLongitudeAxis, getLongitudeWrapper} from './referencing.js'
  
  
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
      this.domainProfiles.push(domainProfile)
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
      transformDomain(domain, this.options.referencing)
      promise = Promise.resolve(domain)
    } else {
      let url = domainOrUrl
      promise = load(url).then(result => {
        let domain = result.data
        transformDomain(domain, this.options.referencing)
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
    return subsetByValue(this, constraints)
  }
}

function subsetByIndex (cov, constraints) {    
  return cov.loadDomain().then(domain => {
    // check and normalize constraints to simplify code
    constraints = shallowcopy(constraints)
    for (let axisName in constraints) {
      if (!domain.axes.has(axisName)) {
        // TODO clarify cov behaviour in the JS API spec
        delete constraints[axisName]
        continue
      }
      if (constraints[axisName] === undefined || constraints[axisName] === null) {
        delete constraints[axisName]
        continue
      }
      if (typeof constraints[axisName] === 'number') {
        let constraint = constraints[axisName]
        constraints[axisName] = {start: constraint, stop: constraint + 1}
      }

      let {start = 0, 
           stop = domain.axes.get(axisName).values.length, 
           step = 1} = constraints[axisName]
      if (step <= 0) {
        throw new Error(`Invalid constraint for ${axisName}: step=${step} must be > 0`)
      }
      if (start >= stop || start < 0) {
        throw new Error(`Invalid constraint for ${axisName}: stop=${stop} must be > start=${start} and both >= 0`)
      }
      constraints[axisName] = {start, stop, step}
    }
    for (let axisName of domain.axes.keys()) {
      if (!(axisName in constraints)) {
        let len = domain.axes.get(axisName).values.length
        constraints[axisName] = {start: 0, stop: len, step: 1}
      }
    }
    
    // After normalization, all constraints are start,stop,step objects.
    // It holds that stop > start, step > 0, start >= 0, stop >= 1.
    // For each axis, a constraint exists.
    
    // subset the axis arrays of the domain (immediately + cached)
    let newdomain = {
      type: DOMAIN,
      // TODO are the profiles still valid?
      profiles: domain.profiles,
      axes: new Map(domain.axes),
      referencing: domain.referencing,
      _rangeShape: domain._rangeShape.slice(), // copy as we will modify it
      _rangeAxisOrder: domain._rangeAxisOrder
    }

    for (let axisName of Object.keys(constraints)) {
      let axis = domain.axes.get(axisName)
      let coords = axis.values
      let bounds = axis.bounds
      let isTypedArray = ArrayBuffer.isView(coords)
      let constraint = constraints[axisName]
      let newcoords
      let newbounds

      let {start, stop, step} = constraint
      if (start === 0 && stop === coords.length && step === 1) {
        newcoords = coords
        newbounds = bounds
      } else if (step === 1 && isTypedArray) {
        newcoords = coords.subarray(start, stop)
        if (bounds) {
          newbounds = {
            get: i => bounds.get(start + i)
          }
        }
      } else {
        let q = Math.trunc((stop - start) / step)
        let r = (stop - start) % step
        let len = q + r
        newcoords = new coords.constructor(len) // array or typed array
        for (let i=start, j=0; i < stop; i += step, j++) {
          newcoords[j] = coords[i]
        }
        if (bounds) {
          newbounds = {
            get: i => bounds.get(start + i*step)
          }
        }
      }
      
      let newaxis = {
        dataType: axis.dataType,
        components: axis.components,
        values: newcoords,
        bounds: newbounds
      }
      newdomain.axes.set(axisName, newaxis)
      newdomain._rangeShape[domain._rangeAxisOrder.indexOf(axisName)] = newcoords.length
    }
          
    // subset the ndarrays of the ranges (on request)
    let rangeWrapper = range => {
      let ndarr = range._ndarr
      
      // fast ndarray view
      let axisNames = domain._rangeAxisOrder
      let los = axisNames.map(name => constraints[name].start)
      let his = axisNames.map(name => constraints[name].stop)
      let steps = axisNames.map(name => constraints[name].step)
      let newndarr = ndarr.hi(...his).lo(...los).step(...steps)
      
      let newrange = {
        dataType: range.dataType,
        get: createRangeGetFunction(newndarr, domain._rangeAxisOrder),
        _ndarr: newndarr
      }
      newrange.shape = new Map()
      for (let axisName of domain.axes.keys()) {
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
      profiles: cov.profiles,
      domainProfiles: cov.domainProfiles,
      parameters: cov.parameters,
      loadDomain: () => Promise.resolve(newdomain),
      loadRange,
      loadRanges
    }
    newcov.subsetByIndex = subsetByIndex.bind(null, newcov)
    newcov.subsetByValue = subsetByValue.bind(null, newcov)
    return newcov
  })
}

function subsetByValue (cov, constraints) {
  return cov.loadDomain().then(domain => {
    // calculate indices and use subsetByIndex
    let indexConstraints = {}
    
    for (let axisName of Object.keys(constraints)) {
      let spec = constraints[axisName]
      if (spec === undefined || spec === null || !domain.axes.has(axisName)) {
        continue
      }
      let axis = domain.axes.get(axisName)
      let vals = axis.values
      
      // special-case handling
      let isISODate = isISODateAxis(domain, axisName)
      let isLongitude = isLongitudeAxis(domain, axisName)
      
      // wrap input longitudes into longitude range of domain axis
      let lonWrapper = isLongitude ? getLongitudeWrapper(domain, axisName) : undefined
      
      if (typeof spec === 'number' || typeof spec === 'string' || spec instanceof Date) {
        let match = spec
        if (isISODate) {
          // convert times to numbers before searching
          match = asTime(match)
          vals = vals.map(v => new Date(v).getTime())
        } else if (isLongitude) {
          match = lonWrapper(match)
        }
        let i
        // older browsers don't have TypedArray.prototype.indexOf
        if (vals.indexOf) {
          i = vals.indexOf(match)
        } else {
          i = Array.prototype.indexOf.call(vals, match)
        }
        if (i === -1) {
          throw new Error('Domain value not found: ' + spec)
        }
        indexConstraints[axisName] = i
        
      } else if ('target' in spec) {
        // find index of value closest to target
        let target = spec.target
        if (isISODate) {
          // convert times to numbers before searching
          target = asTime(target)
          vals = vals.map(v => new Date(v).getTime())
        } else if (isLongitude) {
          target = lonWrapper(target)
        } else if (typeof vals[0] !== 'number' || typeof target !== 'number') {
          throw new Error('Invalid axis or constraint value type')
        }
        let i = indexOfNearest(vals, target)
        indexConstraints[axisName] = i
        
      } else if ('start' in spec && 'stop' in spec) {
        // TODO what about bounds?
        
        let {start,stop} = spec
        if (isISODate) {
          // convert times to numbers before searching
          [start, stop] = [asTime(start), asTime(stop)]
          vals = vals.map(v => new Date(v).getTime())
        } else if (isLongitude) {
          [start, stop] = [lonWrapper(start), lonWrapper(stop)]
        } else if (typeof vals[0] !== 'number' || typeof start !== 'number') {
          throw new Error('Invalid axis or constraint value type')
        }
        
        let [lo1,hi1] = indicesOfNearest(vals, start)
        let [lo2,hi2] = indicesOfNearest(vals, stop)
        
        // cov is a bit arbitrary and may include one or two indices too much
        // (but since we don't handle bounds it doesn't matter that much)
        let imin = Math.min(lo1,hi1,lo2,hi2)
        let imax = Math.max(lo1,hi1,lo2,hi2) + 1 // subsetByIndex is exclusive
        
        indexConstraints[axisName] = {start: imin, stop: imax}
      } else {
        throw new Error('Invalid subset constraints')
      }
    }
    
    return cov.subsetByIndex(indexConstraints)
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
  
  let shape = new Map() // axis name -> axis size (value count)
  for (let axisName of domain.axes.keys()) {
    shape.set(axisName, domain.axes.get(axisName).values.length)
  }
  range.shape = shape
  
  let ndarr = ndarray(vals, domain._rangeShape)
  range._ndarr = ndarr
  range.get = createRangeGetFunction(ndarr, domain._rangeAxisOrder)
  
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
export function transformDomain (domain, referencing) {
  if ('__transformDone' in domain) return
  
  domain.profiles = []
  let profile = domain.profile
  if (profile) {
    if (profile.substr(0,4) !== 'http') {
      profile = PREFIX + profile
    }
    domain.profiles.push(profile)
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
  
  let needsRangeAxisOrder = [...axes.values()].filter(axis => axis.values.length > 1).length > 1
  if (needsRangeAxisOrder && !domain.rangeAxisOrder) {
    throw new Error('Domain requires "rangeAxisOrder"')
  }
  
  domain._rangeAxisOrder = domain.rangeAxisOrder || [...axes.keys()]
  domain._rangeShape = domain._rangeAxisOrder.map(k => axes.get(k).values.length)
  
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
