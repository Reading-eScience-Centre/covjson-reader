/**
 * @external {Parameter} https://github.com/Reading-eScience-Centre/coverage-jsapi/blob/master/Parameter.md
 * @external {Domain} https://github.com/Reading-eScience-Centre/coverage-jsapi/blob/master/Domain.md
 * @external {Range} https://github.com/Reading-eScience-Centre/coverage-jsapi/blob/master/Range.md
 */

import ndarray from 'ndarray'
import template from 'url-template'

import {subsetByIndex as subsetDomainByIndex, normalizeIndexSubsetConstraints} from 'covutils/lib/domain/subset.js'
import {subsetByValue as subsetCoverageByValue} from 'covutils/lib/coverage/subset.js'
import {minMax} from 'covutils/lib/array.js'

import {COVERAGE} from './constants.js'
import {shallowcopy, getNamespacePrefixes, CORE_PREFIX, DOMAINTYPES_PREFIX} from './util.js'

  
  
//NO FILE EXTENSION, to work around JSPM bug in handling package.json's "browser" field
//see https://github.com/jspm/jspm-cli/issues/1062#issuecomment-170342414
import {load} from './http'

/** 
 * Wraps a CoverageJSON Coverage object as a Coverage API object.
 * 
 * @see https://github.com/Reading-eScience-Centre/coverage-jsapi
 */
export default class Coverage {
  
  /**
   * Create a Coverage instance.
   * 
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
    
    /**
     * The constant "Coverage".
     * 
     * @type {string}
     */
    this.type = COVERAGE
    
    /**
     * JSON-LD document
     * 
     * @type {Object}
     */
    this.ld = {}
    
    this._exposeLd(covjson)
    
    this.prefixes = getNamespacePrefixes(this.ld)
    
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
            
    let domainType
    if (typeof this._covjson.domain === 'string') {
      domainType = this._covjson.domainType
    } else {
      domainType = this._covjson.domain.domainType || this._covjson.domainType
    }
    if (domainType && domainType.indexOf(':') === -1) {
      domainType = DOMAINTYPES_PREFIX + domainType
    }

    /**
     * If defined, then the coverage has a domain that follows the given domain type,
     * either a full URI or a namespace-prefixed term. (See .prefixes)
     *  
     * @type {string|undefined} 
     */
    this.domainType = domainType
    
    this._updateLoadStatus()
  }
    
  _updateLoadStatus () {
    let isLoaded = prop => typeof prop === 'object' 
    let domainLoaded = isLoaded(this._covjson.domain)
    let rangesLoaded = Object.keys(this._covjson.ranges).every(key => isLoaded(this._covjson.ranges[key]))
    
    /**
     * A boolean which indicates whether all coverage data is already loaded in memory.
     * If true then this typically means that calls to .loadDomain(), .loadRange(),
     * .loadRanges(), .subsetByIndex(), and .subsetByValue() will not invoke a network request.
     * 
     * @type {boolean}
     */
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
   * Returns a Promise succeeding with a {@link Domain} object.
   * 
   * @return {Promise<Domain>}
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
   * Returns a Promise succeeding with a {@link Range} object.
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
   * @return {Promise<Range>} A Promise object which loads the requested range data and succeeds with a Range object.
   */
  loadRange (paramKey) {
    return loadRangeFn(this)(paramKey)
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
   * @return {Promise<Map<string,Range>>} A Promise object which loads the requested range data and succeeds with a Map object.
   */
  loadRanges (paramKeys) {
    return loadRangesFn(this)(paramKeys)
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
   * @returns {Promise<Coverage>} A Promise object with the subsetted coverage object as result.
   */
  subsetByIndex (constraints) {
    return subsetByIndexFn(this)(constraints)
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
   * @returns {Promise<Coverage>} A Promise object with the subsetted coverage object as result.
   */
  subsetByValue (constraints) {
    return subsetCoverageByValue(this, constraints)
  }
}

function getRangeAxisOrder (domain, range) {
  if (!domain) {
    return range._axisNames
  }
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
  if (!domain) {
    return range._shape
  }
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

function loadRangesFn (cov) {
  return paramKeys => {
    if (paramKeys === undefined) paramKeys = this.parameters.keys()
    paramKeys = Array.from(paramKeys)
    return Promise.all(paramKeys.map(k => cov.loadRange(k))).then(ranges => {
      let map = new Map()
      for (let i=0; i < paramKeys.length; i++) {
        map.set(paramKeys[i], ranges[i])
      }
      return map
    })
  }
}

function loadRangeFn (cov, globalConstraints) {
  return paramKey => {
    // Since the shape of the range array is derived from the domain, it has to be loaded as well.
    return cov.loadDomain().then(() => {
      let rangeOrUrl = cov._covjson.ranges[paramKey]
      if (typeof rangeOrUrl === 'object') {
        let rawRange = rangeOrUrl
        // we need the original domain here, not a potentially subsetted one,
        // therefore we access cov._covjson directly
        // this legacy code will disappear once the old range format is not supported anymore
        return doLoadRange(cov, paramKey, rawRange, cov._covjson.domain, globalConstraints)
      } else {
        let url = rangeOrUrl
        return load(url).then(result => {
          let rawRange = result.data
          return doLoadRange(cov, paramKey, rawRange, cov._covjson.domain, globalConstraints)
        })
      }
    })
  }
}

function doLoadRange (cov, paramKey, range, domain, globalConstraints={}) {
  globalConstraints = normalizeIndexSubsetConstraints(domain, globalConstraints)
  
  if (range.type === 'NdArray' || range.type === 'Range') {
    // if an NdArray, then we modify it in-place (only done the first time)
    transformNdArrayRange(range, domain)
    if (cov.options.cacheRanges) {
      cov._covjson.ranges[paramKey] = range
      cov._updateLoadStatus()
    }
    
    let newrange = subsetNdArrayRangeByIndex(range, domain, globalConstraints)    
    return Promise.resolve(newrange)
    
  } else if (range.type === 'TiledNdArray') {
    return loadTiledNdArraySubset(range, globalConstraints)
    
  } else {
    throw new Error('Unsupported: ' + range.type)
  }
}

/**
 * 
 * @param {object} range TiledNdArray range object
 * @param {object} constraints subsetting constraints
 * @returns {Promise<Range>}
 */
function loadTiledNdArraySubset (range, constraints) {
  let constraintsArr = range.axisNames.map(name => constraints[name])
  
  // step 1: select tileset with least network effort
  let fillNulls = tileShape => tileShape.map((v,i) => v === null ? range.shape[i] : v)    
  let tilesetsStats = range.tileSets.map(ts => getTilesetStats(fillNulls(ts.tileShape), constraintsArr))
  let idxBestTileset = indexOfBestTileset(tilesetsStats)
  let tileset = range.tileSets[idxBestTileset]
  let tileShape = fillNulls(tileset.tileShape)
      
  // step 2: determine the tiles to load
  let subsetTilesetAxes = []
  for (let ax=0; ax < tileShape.length; ax++) {
    let {start,stop,step} = constraintsArr[ax]
    let tileSize = tileShape[ax]
    
    // the indices of the first and last tile containing the subsetting constraints
    let tileStart = Math.floor(start / tileSize) // inclusive
    let tileStop = Math.ceil(stop / tileSize) // exclusive
    
    let tilesetAxis = []
    for (let t=tileStart; t < tileStop; t++) {
      let mid = (t + 0.5) * tileSize
      // regard the subset constraint as a list of [x,y) half-closed intervals and find out where 'mid' falls into
      let iv = Math.floor((mid - start) / step)
      
      // start and end point of the interval in range index space
      let ivStart = start + iv * step
      let ivStop = start + (iv + 1) * step
      
      // tile start and end in range index space
      let tileStartR = t * tileSize
      let tileStopR = (t + 1) * tileSize
      
      // check if the start or end point of the interval lies within the tile
      if (ivStart >= tileStartR || tileStopR <= ivStop) {
        tilesetAxis.push(t)
      }
    }
    subsetTilesetAxes.push(tilesetAxis)
  }
  
  // step 3: create an empty ndarray of the subset shape that will be filled with tile data
  // TODO check if only a single tile will be loaded and avoid copying data around in that case
  let subsetShape = constraintsArr.map(({start,stop,step}) => Math.floor((stop - start) / step) + (stop - start) % step)
  let subsetSize = subsetShape.reduce((l,r) => l*r)
  let subsetNdArr = ndarray(new Array(subsetSize), subsetShape)
  
  // step 4: load tiles and fill subset ndarray
  let urlTemplate = template.parse(tileset.urlTemplate)
  let tiles = cartesianProduct(subsetTilesetAxes)
  let promises = tiles.map(tile => {
    let tileUrlVars = {}
    tile.forEach((v,i) => tileUrlVars[range.axisNames[i]] = v)
    let url = urlTemplate.expand(tileUrlVars)
    return load(url).then(result => {
      let tileRange = result.data
      transformNdArrayRange(tileRange)
      
      // figure out which parts of the tile to copy into which part of the final ndarray
      let tileOffsets = tile.map((v,i) => v * tileShape[i])
      
      // iterate all tile values and for each check if they are part of the subset
      // TODO this code is probably quite slow, consider pre-compiling etc
      let tileAxesSubsetIndices = []
      for (let ax=0; ax < tileShape.length; ax++) {
        let {start,stop,step} = constraintsArr[ax]
        let tileAxisSize = tileShape[ax]
        let tileAxisOffset = tileOffsets[ax]
        let tileAxisSubsetIndices = []
        let startIdx = 0
        if (tileAxisOffset < start) {
          startIdx = start - tileAxisOffset
        }
        let stopIdx = tileAxisSize
        if (tileAxisOffset + stopIdx > stop) {
          stopIdx = stop - tileAxisOffset
        }
        
        for (let i=startIdx; i < stopIdx; i++) {
          let idx = tileAxisOffset + i
          if ((idx - start) % step === 0) {
            tileAxisSubsetIndices.push(i)
          }
        }
        tileAxesSubsetIndices.push(tileAxisSubsetIndices)
      }
      let tileSubsetIndices = cartesianProduct(tileAxesSubsetIndices)
      for (let tileInd of tileSubsetIndices) {
        let val = tileRange._ndarr.get(...tileInd)
        let subsetInd = tileInd.map((i,ax) => {
          let idx = tileOffsets[ax] + i
          return Math.floor((idx - constraintsArr[ax].start) / constraintsArr[ax].step)
        })
        subsetNdArr.set(...subsetInd, val)
      }
    })
  })
  
  // step 5: create and return the new range
  return Promise.all(promises).then(() => {
    let newrange = {
      dataType: range.dataType,
      get: createRangeGetFunction(subsetNdArr, range.axisNames),
      _ndarr: subsetNdArr,
      _axisNames: range.axisNames,
      _shape: subsetShape
    }
    newrange.shape = new Map(range.axisNames.map((v,i) => [v, subsetNdArr.shape[i]]))
    return newrange
  })
}

/**
 * Return the cartesian product of the given arrays.
 * 
 * @see http://stackoverflow.com/a/36234242
 */
function cartesianProduct (arr) {
  return arr.reduce((a,b) => a.map(x => b.map(y => x.concat(y))).reduce((a,b) => a.concat(b), []), [[]])
}

/**
 * Returns the number of tiles and values that have to be loaded, given a set of subsetting constraints.
 * 
 * @param {Array<number>} tileShape
 * @param {Array<object>} constraints - start/stop/step subset constraints for each axis, stop is exclusive
 * @returns {number}
 */
function getTilesetStats (tileShape, constraints) {
  let tileCount = 1
  for (let i=0; i < tileShape.length; i++) {
    let {start, stop, step} = constraints[i]
    let tileSize = tileShape[i]
    
    // the indices of the first and last tile containing the subsetting constraints
    let tileStart = Math.floor(start / tileSize) // inclusive
    let tileStop = Math.ceil(stop / tileSize) // exclusive
    
    // total number of values within the tiles containing the subsetting constraints
    let nvalues = tileSize * (tileStop - tileStart)

    // number of tiles that intersect with the subsetting constraints
    tileCount *= Math.ceil(nvalues / (Math.max(step, tileSize)))
  }
  // the value count is an upper bound as it doesn't account for edge tiles that may be smaller
  let valueCount = tileCount * tileShape.reduce((l,r) => l*r)
  
  return {tileCount, valueCount}
}

/**
 * Returns the index of the tileset with minimum network effort based on the given tileset statistics.
 * Effort here means a combination of number of requested tiles and values.
 * 
 * @param {Array<object>} tilesetsStats
 * @returns {number} index of the tileset with minimum network effort
 */
function indexOfBestTileset (tilesetsStats) {
  // one tile request shall have an equal effort as receiving 1000 values
  let tileValueRatio = 1000
  let efforts = tilesetsStats.map(s => s.tileCount + s.valueCount / tileValueRatio)
  let minEffortIdx = efforts.reduce((imin, x, i, arr) => x < arr[imin] ? i : imin, 0)
  return minEffortIdx
}

function subsetNdArrayRangeByIndex (range, domain, constraints) {
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
    _shape: newndarr.shape
  }
  newrange.shape = new Map(axisNames.map((v,i) => [v, newndarr.shape[i]]))
  return newrange
}

function subsetByIndexFn (cov, globalConstraints) {
  return constraints => {
    return cov.loadDomain().then(domain => {
      constraints = normalizeIndexSubsetConstraints(domain, constraints)
      let newdomain = subsetDomainByIndex(domain, constraints)
      
      let newGlobalConstraints = toGlobalSubsetConstraints(constraints, globalConstraints)
      
      // backwards-compatibility
      if (domain._rangeAxisOrder) {
        newdomain._rangeAxisOrder = domain._rangeAxisOrder
      }
      
      // assemble everything to a new coverage
      let newcov = {
        _covjson: cov._covjson,
        options: cov.options,
        type: COVERAGE,
        // TODO are the profiles still valid?
        domainProfiles: cov.domainProfiles,
        domainType: cov.domainType,
        parameters: cov.parameters,
        loadDomain: () => Promise.resolve(newdomain)
      }
      newcov.loadRange = loadRangeFn(newcov, newGlobalConstraints)
      newcov.loadRanges = loadRangesFn(newcov)
      newcov.subsetByIndex = subsetByIndexFn(newcov, newGlobalConstraints)
      newcov.subsetByValue = subsetCoverageByValue.bind(null, newcov)
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
 * Transforms a CoverageJSON NdArray range to the Coverage API format. Transformation is made in-place.
 * 
 * @param {Object} range The original NdArray range.
 * @param {Object} [domain] The CoverageJSON domain object. 
 * @return {Object} The transformed range.
 */
function transformNdArrayRange (range, domain) {
  if ('__transformDone' in range) return
  
  const values = range.values
    
  if (range.actualMin === undefined) {
    let [min,max] = minMax(values)
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
  
  let ndarr = ndarray(values, shapeArr)
  range._ndarr = ndarr
  range.get = createRangeGetFunction(ndarr, axisNames)
  range.shape = new Map(axisNames.map((v,i) => [v, shapeArr[i]]))
  
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
  
  domainType = domain.domainType || domainType
  if (domainType && domainType.indexOf(':') === -1) {
    domainType = DOMAINTYPES_PREFIX + domainType
  }
  domain.domainType = domainType

  let axes = new Map() // axis name -> axis object
  
  for (let axisName of Object.keys(domain.axes)) {
    axes.set(axisName, domain.axes[axisName])
  }
  domain.axes = axes
  
  // expand start/stop/num regular axes
  // replace 1D numeric axis arrays with typed arrays for efficiency
  for (let [key, axis] of axes) {
    axis.key = key
    
    if (axis.dataType && axis.dataType.indexOf(':') === -1) {
      axis.dataType = CORE_PREFIX + axis.dataType
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

/**
 * Applies the local index subset constraints to the existing global constraints.
 * Both constraint objects must be normalized, that is, must contain the same axes
 * as start/stop/step objects.
 * 
 * @example
 * var local = {x: {start: 0, stop: 50, step: 2}}
 * var global = {x: {start: 500, stop: 1000}}
 * var newGlobal = toGlobalSubsetConstraints(local, global)
 * // newGlobal == {x: {start: 500, stop: 550, step: 2}}
 * 
 * @example
 * var local = {x: {start: 5, stop: 10, step: 2}} // 5, 7, 9
 * var global = {x: {start: 500, stop: 1000, step: 10}} // 500, 510, 520,...
 * var newGlobal = toGlobalSubsetConstraints(local, global) 
 * // newGlobal == {x: {start: 550, stop: 600, step: 20}} // 550, 570, 590
 */
function toGlobalSubsetConstraints (localConstraints, globalConstraints={}) {
  let res = {}
  for (let axis of Object.keys(localConstraints)) {
    let local = localConstraints[axis]
    let {start: globalStart=0, step: globalStep=1} = globalConstraints[axis] || {}
    res[axis] = {
      start: globalStart + globalStep*local.start,
      stop: globalStart + globalStep*local.stop,
      step: globalStep * local.step
    }
  }
  return res
}

function wrapBounds (axis) {
  if (axis.bounds) {
    let bounds = axis.bounds
    return {
      get: i => [bounds[2*i], bounds[2*i + 1]]
    }
  }
}
