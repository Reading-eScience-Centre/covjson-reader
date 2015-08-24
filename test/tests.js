var System = require("jspm");
var assert = require("assert");

var count = 4
var oldit = it
it = function(name, fn) {
  count--
  oldit(name, fn)
}
describe("foo", function() {
  it("bar", function(done) {
    var iv = setInterval(function() {
      if (count === 0) {
        clearInterval(iv)
        done()
      }
    }, 500)
  })
})

System.import("src/reader").then(function(reader) {
  describe("reader methods", function() {
    describe("#read", function() {
      // The following tests only check for basic reading errors.
      // This is done by returning the Promise directly to Mocha which can handle it.
      it("should read a CoverageJSON Coverage in JSON format", function() {
        return reader.default("test/fixtures/Coverage-Profile-standalone.covjson")
      })
      it("should read a CoverageJSON CoverageCollection in JSON format", function() {
        return reader.default("test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson")
      })
      it("should read a CoverageJSON Coverage in object format", function() {
        return reader.default({
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
      it("should read a CoverageJSON CoverageCollection in object format", function() {
        return reader.default({
          "type" : "CoverageCollection",
          "coverages": []
        })
      })
    })
  })
})
.catch(function(e) {
    describe("JSPM", function() {
        it("error", function(done) {
            assert.fail(null, "", e);
        })
    })
})