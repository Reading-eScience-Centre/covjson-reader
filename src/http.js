import {getAcceptHeader} from './http-common.js'

/**
 * See reader.js#load for docs.
 *
 * Browser implementation.
 */
export function load (url, options = {}) {
  let headers = options.headers || {}
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest()
    req.open('GET', url)
    req.responseType = 'text'
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

        let data = JSON.parse(req.response)
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
  var headers = {}
  if (!headerStr) {
    return headers
  }
  var headerPairs = headerStr.split('\u000d\u000a')
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i]
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    var index = headerPair.indexOf('\u003a\u0020')
    if (index > 0) {
      var key = headerPair.substring(0, index).toLowerCase()
      var val = headerPair.substring(index + 2)
      headers[key] = val
    }
  }
  return headers
}
