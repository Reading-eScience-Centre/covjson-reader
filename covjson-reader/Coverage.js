import ndarray from 'ndarray'
import {shallowcopy, minMax, assert, PREFIX} from './util.js'
import {load} from './ajax.js'

/** 
 * Wraps a CoverageJSON Coverage object as a Coverage API object.
 * 
 * @see https://github.com/Reading-eScience-Centre/coverage-jsapi
 * 
 */
export default class Coverage {
  
  /**
   * @param {Object} covjson A CoverageJSON Coverage object.
   * @param {boolean} cacheRanges
   *   If true, then any range that was loaded remotely is cached.
   *   (The domain is always cached.)
   *                           
   */
  constructor(covjson, cacheRanges = false) {
    this._covjson = covjson
    this._exposeLd(covjson)
    
    /** @type {boolean} */
    this.cacheRanges = cacheRanges
    
    this.id = covjson.id
    
    /** @type {Map} */
    this.parameters = new Map()
    for (let key of Object.keys(covjson.parameters)) {
      transformParameter(covjson.parameters, key)
      this.parameters.set(key, covjson.parameters[key])
    }
    
    let profile = this._covjson.profile || 'Coverage'
    if (profile.substr(0,4) !== 'http') {
      profile = PREFIX + profile
    }
    
    /** @type {string} */
    this.type = profile
    
    let domainProfile
    if (typeof this._covjson.domain === 'string') {
      domainProfile = this._covjson.domainProfile || 'Domain'
    } else {
      domainProfile = this._covjson.domain.profile || 'Domain'
    }

    if (domainProfile.substr(0,4) !== 'http') {
      domainProfile = PREFIX + domainProfile
    }
    
    /** @type {string} */
    this.domainType = domainProfile
    
    /**
     * A bounding box array with elements [westLon, southLat, eastLon, northLat].
     * 
     * @type {Array|undefined}
     */
    this.bbox = this._covjson.bbox
  }
  
  _exposeLd (covjson) {
    if (!covjson['@context']) {
      // no LD love here...
      this.ld = {}
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
   * @return {Promise}
   */
  loadDomain () {
    let domainOrUrl = this._covjson.domain
    if (this._domainPromise) return this._domainPromise
    let promise
    if (typeof domainOrUrl === 'object') {
      let domain = domainOrUrl
      transformDomain(domain)
      promise = Promise.resolve(domain)
    } else {
      let url = domainOrUrl
      promise = load(url).then(result => {
        let domain = result.data
        transformDomain(domain)
        this._covjson.domain = domain
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
   * Returns the requested range data as a Promise.
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
          if (this.cacheRanges) {
            this._covjson.ranges[paramKey] = range
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
   * @param {iterable} [paramKeys] An iterable of parameter keys for which to load the range data. If not given, loads all range data.
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
   * cov.subsetByIndex({t: 4, z: {start: 10, stop: 20}, x: [0,1,2] }).then(function(subsetCov) {
   *   // work with subsetted coverage
   * })
   * @param {Object} constraints An object which describes the subsetting constraints.
   *   Every property of it refers to an axis name as defined in Domain.names,
   *   and its value must either be an integer, an array of integers,
   *   or an object with start, stop, and optionally step (defaults to 1) properties
   *   whose values are integers.
   *   Properties that have the values undefined or null are ignored. 
   *   All integers must be non-negative, step must not be zero.
   *   A simple integer constrains the axis to the given index, an array to a list of indices,
   *   and a start/stop/step object to a range of indices:
   *   If step=1, this includes all indices starting at start and ending at stop (exclusive);
   *   if step>1, all indices start, start + step, ..., start + (q + r - 1) step where 
   *   q and r are the quotient and remainder obtained by dividing stop - start by step.
   * @returns {Promise} A Promise object with the subsetted coverage object as result.
   */
  subsetByIndex (constraints) {    
    return this.loadDomain().then(domain => {      
      // check and normalize constraints to simplify code and to allow more optimization
      constraints = shallowcopy(constraints)
      let isConsecutive = arr => {
        let last = arr[0] - 1
        for (let el of arr) {
          if (el !== last + 1) {
            return false
          }
          last = el
        }
        return true
      }
      for (let axisName in constraints) {
        if (!domain.axes.has(axisName)) {
          // TODO clarify this behaviour in the JS API spec
          delete constraints[axisName]
          continue
        }
        if (constraints[axisName] === undefined || constraints[axisName] === null) {
          delete constraints[axisName]
          continue
        }
        if (Array.isArray(constraints[axisName])) {
          let constraint = constraints[axisName]
          // range subsetting can be done with fast ndarray views if single indices or slicing objects are used
          // therefore, we try to transform some common cases into those forms
          if (constraint.length === 1) {
            // transform 1-element arrays into a number
            constraints[axisName] = constraint[0]
          } else if (isConsecutive(constraint)) {
            // transform arrays of consecutive indices into start, stop object
            constraints[axisName] = {start: constraint[0], stop: constraint[constraint.length-1] + 1}
          }
        }
        if (typeof constraints[axisName] === 'number') {
          let constraint = constraints[axisName]
          constraints[axisName] = {start: constraint, stop: constraint + 1}
        }
        if (!Array.isArray(constraints[axisName])) {
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
      }
      for (let axisName of domain.axes.keys()) {
        if (!(axisName in constraints)) {
          let len = domain.axes.get(axisName).values.length
          constraints[axisName] = {start: 0, stop: len, step: 1}
        }
      }
      
      // After normalization, all constraints are either arrays or start,stop,step objects.
      // For all start,stop,step objects, it holds that stop > start, step > 0, start >= 0, stop >= 1.
      // For each axis, a constraint exists.
      
      // subset the axis arrays of the domain (immediately + cached)
      let newdomain = shallowcopy(domain)
      newdomain.axes = new Map(newdomain.axes)
      newdomain._rangeShape = domain._rangeShape.slice() // deep copy

      for (let axisName of Object.keys(constraints)) {
        let coords = domain.axes.get(axisName).values
        let isTypedArray = ArrayBuffer.isView(coords)
        let constraint = constraints[axisName]
        let newcoords
        if (Array.isArray(constraint)) {
          if (isTypedArray) {
            newcoords = new coords.constructor(constraint.length)
            for (let i=0; i < constraint.length; i++) {
              newcoords[i] = coords[constraint[i]]
            }
          } else {
            newcoords = constraint.map(i => coords[i])
          }
        } else {
          let {start, stop, step} = constraint
          if (start === 0 && stop === coords.length && step === 1) {
            newcoords = coords
          } else if (step === 1 && isTypedArray) {
            newcoords = coords.subarray(start, stop)
          } else {
            let q = Math.trunc((stop - start) / step)
            let r = (stop - start) % step
            let len = q + r
            newcoords = new coords.constructor(len) // array or typed array
            for (let i=start, j=0; i < stop; i += step, j++) {
              newcoords[j] = coords[i]
            }
          }
        }
        let newaxis = shallowcopy(domain.axes.get(axisName))
        newaxis.values = newcoords
        newdomain.axes.set(axisName, newaxis)
        newdomain._rangeShape[domain._rangeAxisOrder.indexOf(axisName)] = newcoords.length
      }
            
      // subset the ndarrays of the ranges (on request)
      let rangeWrapper = range => {
        let ndarr = range._ndarr
        
        let newndarr
        if (Object.keys(constraints).some(ax => Array.isArray(constraints[ax]))) {
          // There is a list of indices for at least one axis.
          // In that case we cannot directly use SciJS's slicing operations.
          
          // TODO implement
          throw new Error('not implemented yet')
          
        } else {
          // fast ndarray view
          let axisNames = domain._rangeAxisOrder
          let los = axisNames.map(name => constraints[name].start)
          let his = axisNames.map(name => constraints[name].stop)
          let steps = axisNames.map(name => constraints[name].step)
          newndarr = ndarr.hi(...his).lo(...los).step(...steps)
        }
        
        let newrange = shallowcopy(range)
        newrange._ndarr = newndarr
        newrange.shape = new Map()
        for (let axisName of domain.axes.keys()) {
          newrange.shape.set(axisName, newdomain.axes.get(axisName).values.length)
        }
        
        newrange.get = createRangeGetFunction(newndarr, domain._rangeAxisOrder)
        
        return newrange
      }
      
      let loadRange = key => this.loadRange(key).then(rangeWrapper)
      
      // we wrap loadRanges as well in case it was overridden from the outside
      // (in which case we could not be sure that it invokes loadRange() and uses the wrapper)
      let loadRanges = keys => this.loadRanges(keys).then(ranges => 
        new Map([...ranges].map(([key, range]) => [key, rangeWrapper(range)]))
      )
      
      // assemble everything to a new coverage
      let newcov = shallowcopy(this)
      newcov.loadDomain = () => Promise.resolve(newdomain)
      newcov.loadRange = loadRange
      newcov.loadRanges = loadRanges
      // FIXME subsetByIndex does not exist in the subsetted coverage
      return newcov
    })
  }
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
 * language maps become real Maps. Transformation is made in-place.
 * 
 * @param {Object} param The original parameter.
 */
function transformParameter (params, key) {
  let param = params[key]
  param.key = key
  let maps = [
              [param, 'description'], 
              [param.observedProperty, 'label'],
              [param.observedProperty, 'description'],
              [param.unit, 'label']
             ]
  for (let cat of param.observedProperty.categories || []) {
    maps.push([cat, 'label'])
    maps.push([cat, 'description'])
  }
  for (let entry of maps) {
    transformLanguageMap(entry[0], entry[1])
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
}

function transformLanguageMap (obj, key) {
  if (!obj || !(key in obj) || obj[key] instanceof Map) {
    return    
  }
  var map = new Map()
  for (let tag of Object.keys(obj[key])) {
    map.set(tag, obj[key][tag])
  }
  obj[key] = map
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
  const missingIsEncoded = range.missing === 'nonvalid'
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
    delete range.missing
  }
  
  if (validMin === undefined) {
    let [min,max] = minMax(vals)
    if (min !== null) {
      range.validMin = min
      range.validMax = max
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
  let fn = new Function('ndarr', 'obj', `return ndarr.get(${ndargs})`)
  return fn.bind(undefined, ndarr)
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
 * @return {Object} The transformed domain object.
 */
function transformDomain (domain) {
  if ('__transformDone' in domain) return
  
  let profile = domain.profile || 'Domain'
  if (profile.substr(0,4) !== 'http') {
    profile = PREFIX + profile
  }
  domain.type = profile

  let axes = new Map() // axis name -> axis object
  
  for (let axisName of Object.keys(domain.axes)) {
    axes.set(axisName, domain.axes[axisName])
  }
  domain.axes = axes
  
  // expand start/stop/num regular axes
  // replace 1D numeric axis arrays with typed arrays for efficiency
  for (let axis of axes.values()) {
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
  }
  
  let needsRangeAxisOrder = [...axes.values()].filter(axis => axis.values.length > 1).length > 1
  if (needsRangeAxisOrder && !domain.rangeAxisOrder) {
    throw new Error('Domain requires "rangeAxisOrder"')
  }
  
  domain._rangeAxisOrder = domain.rangeAxisOrder || [...axes.keys()]
  domain._rangeShape = domain._rangeAxisOrder.map(k => axes.get(k).values.length)
  
  domain.__transformDone = true
  
  return domain
}
