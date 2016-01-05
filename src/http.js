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

export function load (url, headers) {
  // TODO implement node version
  throw new Error('node version of http module not implemented yet')
}

