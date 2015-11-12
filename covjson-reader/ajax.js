import cbor from 'cbor'
import {endsWith} from './util.js'

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
 * Loads a CoverageJSON document from a given URL and returns a {@link Promise} object
 * that succeeds with the unmodified CoverageJSON object.
 * 
 * @param {string} url
 * @return {Promise}
 *   The data is the CoverageJSON object. The promise fails if the resource at
 *   the given URL is not a valid JSON or CBOR document. 
 */
export function load(url, responseType='arraybuffer') {
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
      let data
      if (type === MEDIA.COVCBOR) {
        var arrayBuffer = req.response
        data = cbor.decode(arrayBuffer)
      } else if ([MEDIA.COVJSON, MEDIA.JSONLD, MEDIA.JSON].indexOf(type) > -1) {
        if (responseType === 'arraybuffer') {
          // load again (from cache) to get correct response type
          // Note we use 'text' and not 'json' as we want to throw parsing errors.
          // With 'json', the response is just 'null'.
          reject({responseType: 'text'})
          return
        }
        data = JSON.parse(req.response)
        
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
      return load(url, e.responseType)
    } else {
      throw e
    }
  })
}