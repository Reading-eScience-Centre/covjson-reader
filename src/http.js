import request from 'request-promise'

import {getAcceptHeader} from './http-common.js'

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
    let nodeBuffer = response.body
    
    let data = JSON.parse(nodeBuffer.toString())
    
    return {
      data,
      headers: response.headers
    }
  })
}
