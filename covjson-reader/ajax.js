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
 * @param {object} headers Additional HTTP headers to send
 * @return {Promise}
 *   The result is an object {data, headers} where data is the CoverageJSON object
 *   and headers are the HTTP response headers. The promise fails if the resource at
 *   the given URL is not a valid JSON or CBOR document. 
 */
export function load (url, headers, responseType='arraybuffer') {
  if (['arraybuffer', 'text'].indexOf(responseType) === -1) {
    throw new Error()
  }
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest()
    req.open('GET', url)
    req.responseType = responseType
    req.setRequestHeader('Accept', ACCEPT)
    if (headers) {
      for (let header of Object.keys(headers)) {
        req.setRequestHeader(header, headers[header])
      }
    }

    req.addEventListener('load', () => {
      try {
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
          let t0 = new Date()
          data = cbor.decode(arrayBuffer)
          console.log('CBOR decoding: ' + (new Date()-t0) + 'ms')
        } else if ([MEDIA.COVJSON, MEDIA.JSONLD, MEDIA.JSON].indexOf(type) > -1) {
          if (responseType === 'arraybuffer') {
            if (window.TextDecoder) {
              let t0 = new Date()
              data = JSON.parse(new TextDecoder().decode(new DataView(req.response)))
              console.log('JSON decoding: ' + (new Date()-t0) + 'ms')
            } else {
              // load again (from cache) to get correct response type
              // Note we use 'text' and not 'json' as we want to throw parsing errors.
              // With 'json', the response is just 'null'.
              reject({responseType: 'text'})
              return
            }
          } else {
            let t0 = new Date()
            data = JSON.parse(req.response)
            console.log('JSON decoding (slow path): ' + (new Date()-t0) + 'ms')
          }        
        } else {
          reject(new Error('Unsupported media type: ' + type))
          return
        }
        let responseHeaders = parseResponseHeaders(req.getAllResponseHeaders())
        resolve({
          data: data,
          headers: responseHeaders
        })
      } catch (e) {
        reject(e)
      }
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

/**
 * XmlHttpRequest's getAllResponseHeaders() method returns a string of response
 * headers according to the format described here:
 * http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method
 * This method parses that string into a user-friendly key/value pair object.
 * 
 * https://gist.github.com/monsur/706839
 */
function parseResponseHeaders (headerStr) {
  var headers = {};
  if (!headerStr) {
    return headers;
  }
  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}
