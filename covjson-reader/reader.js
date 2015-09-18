import ndarray from 'ndarray'
import cbor from 'cbor'

export const PREFIX = 'http://coveragejson.org/def#'

const MEDIA = {
    COVCBOR: 'application/prs.coverage+cbor',
    COVJSON: 'application/prs.coverage+json',
    JSONLD: 'application/ld+json',
    JSON: 'application/json',
    OCTETSTREAM: 'application/octet-stream',
    TEXT: 'text/plain'
}

const ACCEPT = MEDIA.COVCBOR + '; q=1.0, ' +
               MEDIA.COVJSON + '; q=0.5, ' + 
               MEDIA.JSONLD + '; q=0.1, ' + 
               MEDIA.JSON + '; q=0.1'
               
const EXT = {
    COVJSON: '.covjson',
    COVCBOR: '.covcbor'
}

/**
 * 
 * Example:
 * 
 * <pre><code>
 * read('http://example.com/coverage.covjson').then(function (cov) {
 *   // work with Coverage object
 * }).catch(function (e) {
 *   // there was an error when loading the coverage
 *   console.log(e.message)
 * })
 * </code></pre>
 * 
 * 
 * @param {Object|URL} input 
 *    Either a URL pointing to a CoverageJSON Coverage or Coverage Collection document
 *    or a CoverageJSON Coverage or Coverage Collection object.
 * @return {Promise} 
 *    A promise object having a Coverage object or, for CoverageJSON Coverage Collections,
 *    an array of Coverage objects as data. In the error case, an Error object is supplied
 *    from the Promise.
 */
export default function read (input) {
  if (typeof input === 'object') {
    return new Promise(resolve => resolve(transformCovJSON(input)))
  } else {
    // it's a URL, load it
    return loadCovJSON(input).then(transformCovJSON)
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
  
  if (endsWith(obj.type, 'Coverage')) {
    var cov = new Coverage(obj)
  } else { // Collection
    var cov = []
    let rootParams = obj.parameters ? obj.parameters : {}
    for (let coverage of obj.coverages) {
      if (coverage.parameters) {
        for (let key of Object.keys(rootParams)) {
          if (key in coverage.ranges) {
            coverage.parameters[key] = rootParams[key]
          }
        }
      } else {
        coverage.parameters = rootParams
      } 
      cov.push(new Coverage(coverage))
    }
  }
  
  return cov
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

function endsWith (subject, search) {
  // IE support
  let position = subject.length - search.length
  let lastIndex = subject.indexOf(search, position)
  return lastIndex !== -1 && lastIndex === position
}

/**
 * Loads a CoverageJSON document from a given URL and returns a Promise.
 * 
 * @return {Promise}
 *   The data is the CoverageJSON object. The promise fails if the resource at
 *   the given URL is not a valid JSON or CBOR document. 
 */
export function loadCovJSON(url, responseType='arraybuffer') {
  if (['arraybuffer', 'text'].indexOf(responseType) === -1) {
    throw new Error()
  }
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest()
    req.open('GET', url)
    req.responseType = responseType
    req.setRequestHeader('Accept', ACCEPT)

    req.addEventListener('load', () => {
      if (!(req.status >= 200 && req.status < 300 || req.status === 304)) { // as in jquery
        reject(new Error('Resource "' + url + '" not found, HTTP status code: ' + req.status))
        return
      }
      
      var type = req.getResponseHeader('Content-Type')
      
      if (type.indexOf(MEDIA.OCTETSTREAM) === 0 || type.indexOf(MEDIA.TEXT) === 0) {
        // wrong media type, try to infer type from extension
        if (endsWith(url, EXT.COVJSON)) {
          type = MEDIA.COVJSON
        } else if (endsWith(url, EXT.COVCBOR)) {
          type = MEDIA.COVCBOR
        } 
      }
      
      if (type === MEDIA.COVCBOR) {
        var arrayBuffer = req.response
        var data = cbor.decode(arrayBuffer)
      } else if ([MEDIA.COVJSON, MEDIA.JSONLD, MEDIA.JSON].indexOf(type) > -1) {
        if (responseType === 'arraybuffer') {
          // load again (from cache) to get correct response type
          // Note we use 'text' and not 'json' as we want to throw parsing errors.
          // With 'json', the response is just 'null'.
          reject({responseType: 'text'})
          return
        }
        var data = JSON.parse(req.response)
        
      } else {
        reject(new Error('Unsupported media type: ' + type))
        return
      }
      resolve(data)
    })
    req.addEventListener('error', () => {
      reject(new Error('Network error loading resource at ' + url))
    })

    req.send()
  }).catch(e => {
    if (e.responseType) {
      return loadCovJSON(url, e.responseType)
    } else {
      throw e
    }
  })
}

/** Wraps a CoverageJSON Coverage object as a Coverage API object. 
 * 
 */
export class Coverage {
  
  /**
   * @param {Object} covjson A CoverageJSON Coverage object.
   * @param {Bool} cacheRanges
   *   If true, then any range that was loaded remotely is cached.
   *   (The domain is always cached.)
   *                           
   */
  constructor(covjson, cacheRanges = false) {
    this.covjson = covjson
    this.cacheRanges = cacheRanges
    
    this.params = new Map()
    for (let key of Object.keys(covjson.parameters)) {
      transformParameter(covjson.parameters[key])
      this.params.set(key, covjson.parameters[key])
    }
  }
  
  get type () {
    return PREFIX + this.covjson.type
  }
  
  get domainType () {
    // we extract the domain type from the coverage type
    // this is possible with CoverageJSON since there is a 1:1 relationship
    let withoutSuffix = this.covjson.type.substr(0, this.covjson.type.length - 'Coverage'.length)
    return PREFIX + withoutSuffix
  }
  
  get bbox () {
    // TODO not done in CovJSON spec yet
    return null
  }
  
  get timeExtent () {
    // TODO not done in CovJSON spec yet
    return null    
  }
  
  get verticalExtent () {
    // TODO not done in CovJSON spec yet
    return null    
  }
  
  /**
   * A Map of parameters.
   */
  get parameters () {
    return this.params
  }
  
  loadDomain () {
    let domainOrUrl = this.covjson.domain
    if (this._domainPromise) return this._domainPromise
    if (typeof domainOrUrl === 'object') {
      var promise = new Promise(resolve => {
        transformDomain(domainOrUrl)
        resolve(domainOrUrl)
      })
    } else { // URL
      var promise = loadCovJSON(domainOrUrl).then(domain => {
        transformDomain(domain)
        this.covjson.domain = domain
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
   * Example:
   * 
   * <pre><code>
   * var cov = ... 
   * cov.loadRange('salinity').then(function (sal) {
   *   // work with Range object
   * }).catch(function (e) {
   *   // there was an error when loading the range
   *   console.log(e.message)
   * })
   * </code></pre>
   * 
   * @param {string} paramKey The key of the Parameter for which to load the range.
   * @return A Promise object which loads the requested range data and provides a Range object in its callback.
   */
  loadRange (paramKey) {
    // Since the shape of the range array is derived from the domain, it has to be loaded as well.
    return this.loadDomain().then(domain => {
      let rangeOrUrl = this.covjson.ranges[paramKey]
      let isCategorical = 'categories' in this.parameters.get(paramKey)
      if (typeof rangeOrUrl === 'object') {
        transformRange(rangeOrUrl, domain.shape, isCategorical)
        return new Promise(resolve => {
          resolve(rangeOrUrl)
        })
      } else { // URL
        return loadCovJSON(rangeOrUrl).then(range => {
          transformRange(range, domain.shape, isCategorical)
          if (this.cacheRanges) {
            this.covjson.ranges[paramKey] = range
          }
          return range
        })
      }
    })    
  }
  
}

/**
 * Currently unused, but may need in future.
 * This determines the best array type for categorical data which
 * doesn't have missing values.
 */
function arrayType(validMin, validMax) {
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

/**
 * Transforms a CoverageJSON parameter to the Coverage API format, that is,
 * language maps become real Maps. Transformation is made in-place.
 * 
 * @param {Object} param The original parameter.
 */
function transformParameter (param) {
  let maps = [
              [param, 'description'], 
              [param.observedProperty, 'label'],
              [param.observedProperty, 'description'],
              [param.unit, 'label']
             ]
  for (let cat of param.categories || []) {
    maps.push([cat, 'label'])
    maps.push([cat, 'description'])
  }
  for (let entry of maps) {
    transformLanguageMap(entry[0], entry[1])
  }
}

function transformLanguageMap (obj, key) {
  if (!obj || !(key in obj)) {
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
 * @param {Array} shape The array shape of the range values as determined by the domain. 
 * @param {bool} isCategorical
 *    Whether the range represents categories and should be treated as integers.
 *    This hint is currently not used. It may come in handy for typed arrays later.  
 * @return {Object} The transformed range.
 */
function transformRange (range, shape, isCategorical) {
  if ('__transformDone' in range) return
  
  const values = range.values
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
    [min,max] = minMax(vals)
    if (min !== null) {
      range.validMin = min
      range.validMax = max
    }
  }
  
  range.values = ndarray(vals, shape)  
  range.__transformDone = true
  
  return range
}

function minMax (arr) {
  var len = arr.length
  var min = Infinity
  var max = -Infinity
  while (len--) {
    var el = arr[len]
    if (el == null) {
      // do nothing
    } else if (el < min) {
      min = el
    } else if (el > max) {
      max = el
    }
  }
  if (min === Infinity) {
    min = max
  } else if (max === -Infinity) {
    max = min
  }
  if (min === Infinity) {
    // all values were null
    min = null
    max = null
  }
  return [min, max]
}

/**
 * Transforms a CoverageJSON domain to the Coverage API format.
 * Transformation is made in-place.
 * 
 * @param {Object} domain The original domain object.
 * @return {Object} The transformed domain object.
 */
function transformDomain (domain) {
  if ('__transformDone' in domain) return
   
  let type = domain.type
  let x = axisSize(domain.x) 
  let y = axisSize(domain.y)
  let z = axisSize(domain.z)
  let t = axisSize(domain.t)
  
  domain.type = PREFIX + type
  
  const T = 't'
  const Z = 'z'
  const Y = 'y'
  const X = 'z'
  const P = 'p'
  const SEQ = 'seq'
    
  let shape
  let names
  switch (type) {
  case 'Grid': 
    shape = [t,z,y,x]; names = [T,Z,Y,X]; break
  case 'Profile': 
    shape = [z]; names = [Z]; break
  case 'PointSeries':
    shape = [t]; names = [T]; break
  case 'Point':
    shape = [1]; names = [P]; break
  case 'Trajectory':
    assert(x === y === t, 'Trajectory cannot have x, y, t arrays of different lengths')
    assert(!Array.isArray(domain.z) || x === z, 'Trajectory z array must be of same length as x, y, t arrays')
    let seq = domain.sequence.join('')
    assert((Array.isArray(domain.z) && seq === 'xyzt') || (!Array.isArray(domain.z) && seq === 'xyt'),
        'Trajectory must have "sequence" property ["x","y","t"] or ["x","y","z","t"]')
    shape = [x]; names = [SEQ]; break
  case 'Section':
    assert(x === y === t, 'Section cannot have x, y, t arrays of different lengths')
    assert(domain.sequence.join('') === 'xyt', 'Section must have "sequence" property ["x","y","t"]')
    shape = [z,x]; names = [Z,SEQ]; break
  case 'Polygon':
    shape = [1]; names = [P]; break
  case 'PolygonSeries':
    shape = [t]; names = [T]; break
  case 'MultiPolygon':
    shape = [axisSize(domain.polygon)]; names = [P]; break
  case 'MultiPolygonSeries':
    shape = [t,axisSize(domain.polygon)]; names = [T,P]; break
  default:
    throw new Error('Unknown domain type: ' + type)
  }
  
  domain.shape = shape
  
  // replace 1D numeric axis arrays with typed arrays for efficiency
  for (let field of ['x', 'y', 'z', 't']) {
    if (field in domain) {
      let axis = domain[field]
      if (ArrayBuffer.isView(axis)) {
        // already a typed array
        continue
      }
      if (Array.isArray(axis) && typeof axis[0] === 'number') {
        let arr = new Float64Array(axis.length)
        for (let i=0; i < axis.length; i++) {
          arr[i] = axis[i]
        }
        domain[field] = arr
      }
    }
  }
  
  domain.__transformDone = true
  
  return domain
}

/**
 * 
 * @param {Array|scalar|undefined} axis
 * @returns the elements within the axis or 1 if not defined
 */
function axisSize(axis) {
  if (Array.isArray(axis)) {
    return axis.length
  }
  return 1  
}

function assert (condition, message) {
  if (!condition) {
    message = message || 'Assertion failed'
    throw new Error(message)
  }
}