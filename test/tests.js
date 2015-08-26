// these are npm-only imports!
import System from 'jspm'
import assert from 'assert'

describe("reader methods", function() {
  let reader
  
  before(() => {
    return System.import('src/reader')
      .then(mod => reader = mod.default)
  })
  
  describe("#read", () => {
    // The following tests only check for basic reading errors.
    // This is done by returning the Promise directly to Mocha which can handle it.
    it("should read a CoverageJSON Coverage in JSON format", () => {
      // FIXME not so easy to support this within node as there is no really good xhr2 library
      return reader("file://test/fixtures/Coverage-Profile-standalone.covjson")
    })
    it("should read a CoverageJSON CoverageCollection in JSON format", () => {
      // FIXME see above
      return reader("file://test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson")
    })
    it("should read a CoverageJSON Coverage in object format", () => {
      return reader({
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
      return reader({
        "type" : "CoverageCollection",
        "coverages": []
      })
    })
  })
})
