export const MEDIATYPE = {
    COVCBOR: 'application/prs.coverage+cbor',
    COVJSON: 'application/prs.coverage+json',
    JSONLD: 'application/ld+json',
    JSON: 'application/json',
    OCTETSTREAM: 'application/octet-stream',
    TEXT: 'text/plain'
}

export const COVJSON_PROFILE_STANDALONE = 'http://coveragejson.org/profiles/standalone'

export function getAcceptHeader (standalone) {
  let covjsonProfile = standalone ? '; profile="' + COVJSON_PROFILE_STANDALONE + '"' : ''
  let accept = MEDIATYPE.COVCBOR + '; q=1.0, ' +
    MEDIATYPE.COVJSON + covjsonProfile + '; q=0.5, ' + 
    MEDIATYPE.JSONLD + '; q=0.1, ' + 
    MEDIATYPE.JSON + '; q=0.1'
  return accept
}

               
export const EXT = {
    COVJSON: '.covjson',
    COVCBOR: '.covcbor'
}