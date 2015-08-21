import ndarray from 'ndarray'
import cbor from 'cbor'

const MEDIA = {
    COVCBOR: 'application/prs.coverage+cbor',
    COVJSON = 'application/prs.coverage+json',
    JSONLD = 'application/ld+json',
    JSON = 'application/json'
}
const ACCEPT = MEDIA.COVCBOR + '; q=1.0, ' +
               MEDIA.COVJSON + '; q=0.5, ' + 
               MEDIA.JSONLD + '; q=0.1, ' + 
               MEDIA.JSON + '; q=0.1'

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
  try {
    checkValidCovJSON(obj)
  } catch (error) {
    throw new Error('Not a valid CoverageJSON document, reason: ' + error.message)
  }
  if (obj.type !== 'Coverage' && obj.type !== 'CoverageCollection') {
    throw new Error('CoverageJSON document must be of Coverage or CoverageCollection type')
  }
  
  if (obj.type === 'Coverage') {
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
  if (obj.type === 'Coverage') {
    assert('parameters' in obj, '"parameters" missing')
    assert('domain' in obj, '"domain" missing')
    assert('ranges' in obj, '"ranges" missing')
  } else if (obj.type === 'CoverageCollection') {
    assert(Array.isArray(obj.coverages), '"coverages" must be an array')
  }
}

/**
 * Loads a CoverageJSON document from a given URL and returns a Promise.
 * 
 * @return {Promise}
 *   The data is the CoverageJSON object. The promise fails if the resource at
 *   the given URL is not a valid JSON or CBOR document. 
 */
export function loadCovJSON(url) {
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest()
    req.open('GET', url)
    req.responseType = 'arraybuffer'
    req.setRequestHeader('Accept', ACCEPT)

    req.onload = () => {
      if (!(req.status >= 200 && status < 300 || status === 304)) { // as in jquery
        reject(new Error('Resource not found, HTTP status code: ' + req.status))
        return
      }
      
      var type = req.getResponseHeader('Content-Type')
      if (type === MEDIA.COVCBOR) {
        var arrayBuffer = req.response
        var data = cbor.decode(arrayBuffer)
      } else if ([MEDIA.COVJSON, MEDIA.JSONLD, MEDIA.JSON].indexOf(type) > -1) {
        var data = JSON.parse(req.responseText)
      } else {
        // unsupported media type
        reject(new Error('Unsupported media type: ' + type))
        return
      }
      resolve(data)
    }
    req.onerror = () => {
      reject(new Error('Network error loading resource at ' + url))
    }

    req.send()
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
      this.params.set(key, covjson.parameters[key])
    }
  }
  
  get type () {
    // the domain type
    // TODO if the domain is not embedded then the type must be taken from somewhere else...
    return this.covjson.domain.type
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
    if (typeof domainOrUrl === 'object') {
      transformDomain(domainOrUrl)
      return new Promise(resolve => {
        resolve(domainOrUrl)
      })
    } else { // URL
      return loadCovJSON(domainOrUrl).then(domain => {
        transformDomain(domain)
        this.covjson.domain = domain
        return domain
      }
    }
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
        }
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
  
  range.values = ndarray(vals, shape)  
  range.__transformDone = true
  
  return range
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
  let x = dimSize(domain.x) 
  let y = dimSize(domain.y)
  let z = dimSize(domain.z)
  let t = dimSize(domain.t)
  
  domain.type = 'http://coveragejson.org/def/domains/' + type
  
  let shape
  switch (type) {
  case 'Grid': 
    shape = [t,z,y,x]; break
  case 'Profile': 
    shape = [z]; break
  case 'PointSeries':
    shape = [t]; break
  case 'Point':
    shape = [1]; break
  case 'Trajectory':
    assert(x === y === t, 'Trajectory cannot have x, y, t arrays of different lengths')
    assert(!Array.isArray(domain.z) || x === z, 'Trajectory z array must be of same length as x, y, t arrays')
    let seq = domain.sequence.join('')
    assert((Array.isArray(domain.z) && seq === 'xyzt') || (!Array.isArray(domain.z) && seq === 'xyt'),
        'Trajectory must have "sequence" property ["x","y","t"] or ["x","y","z","t"]')
    shape = [x]; break
  case 'Section':
    assert(x === y === t, 'Section cannot have x, y, t arrays of different lengths')
    assert(domain.sequence.join('') === 'xyt', 'Section must have "sequence" property ["x","y","t"]')
    shape = [z,x]; break
  case 'Polygon':
    shape = [1]; break
  case 'PolygonSeries':
    shape = [t]; break
  case 'MultiPolygon':
    shape = [dimSize(domain.polygon)]; break
  case 'MultiPolygonSeries':
    shape = [t,dimSize(domain.polygon)]; break
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