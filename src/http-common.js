export const MEDIATYPE = {
    COVCBOR: 'application/prs.coverage+cbor',
    COVJSON: 'application/prs.coverage+json',
    JSONLD: 'application/ld+json',
    JSON: 'application/json',
    OCTETSTREAM: 'application/octet-stream',
    TEXT: 'text/plain'
}

export const ACCEPT = MEDIATYPE.COVCBOR + '; q=1.0, ' +
               MEDIATYPE.COVJSON + '; q=0.5, ' + 
               MEDIATYPE.JSONLD + '; q=0.1, ' + 
               MEDIATYPE.JSON + '; q=0.1'
               
export const EXT = {
    COVJSON: '.covjson',
    COVCBOR: '.covcbor'
}