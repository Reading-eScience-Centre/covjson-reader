import cbor from 'cbor-js'
import request from 'request-promise'

import {endsWith} from './util.js'
import {MEDIATYPE, ACCEPT, EXT} from './http-common.js'

export function load (url, headers) {
  let mergedHeaders = {
    Accept: ACCEPT
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
    if (type.indexOf(MEDIATYPE.OCTETSTREAM) === 0 || type.indexOf(MEDIATYPE.TEXT) === 0) {
      // wrong media type, try to infer type from extension
      if (endsWith(url, EXT.COVJSON)) {
        type = MEDIATYPE.COVJSON
      } else if (endsWith(url, EXT.COVCBOR)) {
        type = MEDIATYPE.COVCBOR
      } 
    }
    
    let nodeBuffer = response.body
    
    let data
    if (type === MEDIATYPE.COVCBOR) {
      // see http://stackoverflow.com/a/19544002
      let arrayBuffer = new Uint8Array(nodeBuffer).buffer
      data = cbor.decode(arrayBuffer)
    } else if ([MEDIATYPE.COVJSON, MEDIATYPE.JSONLD, MEDIATYPE.JSON].indexOf(type) > -1) {
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
