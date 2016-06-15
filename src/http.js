import cbor from 'cbor-js'
import request from 'request-promise'

import {endsWith} from './util.js'
import {MEDIATYPE, matchesMediaTypes, getAcceptHeader, EXT} from './http-common.js'

/**
 * See reader.js#load for docs.
 * 
 * Node.js implementation.
 */
export function load (url, options = {}) {
  let headers = options.headers || {}
  let accept = getAcceptHeader(options.eagerload)
  let mergedHeaders = {
    Accept: accept
  }
  for (let header of Object.keys(headers)) {
    mergedHeaders[header] = headers[header]
  }
  return request({
    uri: url,
    headers: mergedHeaders,
    gzip: true,
    encoding: null, // response data type will be Buffer
    resolveWithFullResponse: true
  }).then(response => {
    let type = response.headers['content-type']
    if (matchesMediaTypes(type, [MEDIATYPE.OCTETSTREAM, MEDIATYPE.TEXT])) {
      // wrong media type, try to infer type from extension
      if (endsWith(url, EXT.COVJSON)) {
        type = MEDIATYPE.COVJSON
      } else if (endsWith(url, EXT.COVCBOR)) {
        type = MEDIATYPE.COVCBOR
      } 
    }
    
    let nodeBuffer = response.body
    
    let data
    if (matchesMediaTypes(type, MEDIATYPE.COVCBOR)) {
      // see http://stackoverflow.com/a/19544002
      let arrayBuffer = new Uint8Array(nodeBuffer).buffer
      data = cbor.decode(arrayBuffer)
    } else if (matchesMediaTypes(type, [MEDIATYPE.COVJSON, MEDIATYPE.JSONLD, MEDIATYPE.JSON])) {
      data = JSON.parse(nodeBuffer.toString())
    } else {
      throw new Error('Unsupported media type: ' + type)
    }
    
    return {
      data,
      headers: response.headers
    }
  })
}
