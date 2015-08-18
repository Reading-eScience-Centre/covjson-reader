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
   * 
   * 
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
    // TODO should loading a range implicitly load the domain as well if it's not loaded yet?
    
    let rangeOrUrl = this.covjson.ranges[paramKey]
    if (typeof rangeOrUrl === 'object') {
      transformRange(rangeOrUrl)
      return new Promise(resolve => {
        resolve(rangeOrUrl)
      })
    } else { // URL
      return loadCovJSON(rangeOrUrl).then(range => {
        transformRange(range)
        if (this.cacheRanges) {
          this.covjson.ranges[paramKey] = range
        }
        return range
      }
    }
  }
  
}

/**
 * Transforms a CoverageJSON range to the Coverage API format, that is,
 * no special encoding etc. Transformation is made in-place.
 * 
 * @param {Object} range The original range.
 * @return {Object} The transformed range.
 */
function transformRange (range) {
  if ('__transformDone' in range) return
  
  const values = range.values
  const isTyped = ArrayBuffer.isView(values)
  const hasMissing = range.missing === 'nonvalid'
  const hasOffsetFactor = 'offset' in range

  if ('offset' in range) {
    assert('factor' in range)
  }
  const offset = range.offset
  const factor = range.factor
  
  if (hasMissing) {
    assert('validMin' in range)
    assert('validMax' in range)
  }
  const validMin = range.validMin
  const validMax = range.validMax
  
  if (isTyped && !hasMissing && !hasOffsetFactor) {
    // As we don't have to transform any values we can keep the
    // efficient typed array representation and are done.
  } else {
    // Transformation is necessary.
    let vals = new Array(values.length)
    if (hasOffsetFactor) {
      for (let i=0; i < values.length; i++) {
        const val = values[i]
        if (hasMissing && (val < validMin || val > validMax)) {
          // leave vals[i] as undefined
        } else {
          vals[i] = val * factor + offset
        }
      }
      
      if (validMin !== undefined) {
        range.validMin = validMin * factor + offset
        range.validMax = validMax * factor + offset
      }
    } else if (hasMissing) {
      for (let i=0; i < values.length; i++) {
        const val = values[i]
        if (val < validMin || val > validMax) {
          // leave vals[i] as undefined
        } else {
          vals[i] = val
        }
      }
    }
    range.values = vals
    
    delete range.offset
    delete range.factor
    delete range.missing
  }
    
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
  
  // TODO 
  
  return domain
}

function assert (condition, message) {
  if (!condition) {
    message = message || 'Assertion failed'
    throw new Error(message)
  }
}