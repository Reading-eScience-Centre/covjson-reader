import assert from 'assert'
import sinon from 'sinon'

import read from 'covjson-reader/reader'

describe("reader methods", () => {
  let server

  before(() => {
    server = sinon.fakeServer.create()
  })
  
  after(() => {
    server.restore()
  })
  
  describe("#read", () => {
    // The following tests only check for basic reading errors.
    // This is done by returning the Promise directly to Mocha which can handle it.
    
    it("should read a CoverageJSON Coverage in JSON format", () => {
      // mocks XMLHttpRequest
      server.respondWith('GET', 'http://example.com/coverage.covjson',
          [200, { 'Content-Type': 'application/prs.coverage+json' },
           // FIXME check how to do fixtures with karma
           readthatsomehow('test/fixtures/Coverage-Profile-standalone.covjson', 'utf8')])
      
      return read("http://example.com/coverage.covjson")
    })
    it("should read a CoverageJSON CoverageCollection in JSON format", () => {
      server.respondWith('GET', 'http://example.com/coverages.covjson',
          [200, { 'Content-Type': 'application/prs.coverage+json' },
           readthatsomehow('test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson', 'utf8')])
      
      return read("http://example.com/coverages.covjson")
    })
    it("should read a CoverageJSON Coverage in object format", () => {
      return read({
        "type" : "Coverage",
        "domain" : {
          "type" : "Profile",
          "x" : -10.1,
          "y" : -40.2,
          "z" : [ 5.4562, 8.9282 ],
          "t" : "2013-01-13T11:12:20Z"
        },
        "parameters" : {
          "PSAL": {
            "type" : "Parameter",
            "unit" : {
              "symbol" : "psu"
            },
            "observedProperty" : {
              "label" : "Sea Water Salinity"
            }
          }
        },
        "ranges" : {
          "type" : "RangeSet",
          "PSAL" : {
            "type" : "Range",
            "values" : [ 43.9599, 43.9599 ]
          }
        }
      })
    })
    it("should read a CoverageJSON CoverageCollection in object format", () => {
      return read({
        "type" : "CoverageCollection",
        "coverages": []
      })
    })
  })
})
