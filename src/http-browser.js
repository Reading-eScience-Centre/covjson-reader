import cbor from 'cbor-js'
import {endsWith} from './util.js'
import {MEDIATYPE, matchesMediaTypes, getAcceptHeader, EXT} from './http-common.js'

export function load (url, options = {}, responseType='arraybuffer') {
  if (['arraybuffer', 'text'].indexOf(responseType) === -1) {
    throw new Error()
  }
  let headers = options.headers || {}
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest()
    req.open('GET', url)
    req.responseType = responseType
    let accept = getAcceptHeader(options.eagerload)
    req.setRequestHeader('Accept', accept)
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
        
        if (matchesMediaTypes(type, [MEDIATYPE.OCTETSTREAM, MEDIATYPE.TEXT])) {
          // wrong media type, try to infer type from extension
          if (endsWith(url, EXT.COVJSON)) {
            type = MEDIATYPE.COVJSON
          } else if (endsWith(url, EXT.COVCBOR)) {
            type = MEDIATYPE.COVCBOR
          } 
        }
        let data
        if (matchesMediaTypes(type, MEDIATYPE.COVCBOR)) {
          var arrayBuffer = req.response
          let t0 = new Date()
          data = cbor.decode(arrayBuffer)
          console.log('CBOR decoding: ' + (new Date()-t0) + 'ms')
        } else if (matchesMediaTypes(type, [MEDIATYPE.COVJSON, MEDIATYPE.JSONLD, MEDIATYPE.JSON])) {
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
          data,
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
      return load(url, headers, e.responseType)
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
 * Header names are lower-cased.
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
      var key = headerPair.substring(0, index).toLowerCase();
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}
