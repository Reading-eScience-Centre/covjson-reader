import assert from 'assert'

import read from 'covjson-reader/reader'

function readall(input) {
  return read(input).then(cov => {
    if (!Array.isArray(cov)) {
      return cov.loadDomain()
    }
  })
}

describe("reader methods", () => {
  let server

  describe("#read", () => {
    // The following tests only check for basic reading errors.
    // This is done by returning the Promise directly to Mocha which can handle it.
    
    it("should read a CoverageJSON Coverage in JSON format", () => {
      return readall("base/test/fixtures/Coverage-Profile-standalone.covjson")
    })
    it("should read a CoverageJSON CoverageCollection in JSON format", () => {
      return readall("base/test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson")
    })
    it("should read a CoverageJSON Coverage in object format", () => {
      return readall({
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
              "label" : {
                "en": "Sea Water Salinity"
              }
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
      return readall({
        "type" : "CoverageCollection",
        "coverages": []
      })
    })
  })
})
