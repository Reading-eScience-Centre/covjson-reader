import assert from 'assert'

import {read} from 'covjson-reader/reader'
import {PREFIX} from 'covjson-reader/reader'

const FIXTURES = {
    ProfileURL: 'base/test/fixtures/Coverage-Profile-standalone.covjson',
    CollectionURL: 'base/test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson',
    Profile: () => ({
      "type" : "ProfileCoverage",
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
          "values" : [ 43.9599, 43.3599 ]
        }
      }
    }),
    CollectionEmpty: () => ({
      "type" : "CoverageCollection",
      "coverages": []
    })
}

function readall(input) {
  if (typeof input === 'object') {
    // reader modifies object in-place, so we create a copy for tests
    input = JSON.parse(JSON.stringify(input))
  }
  return read(input).then(cov => {
    if (!Array.isArray(cov)) {
      return cov.loadDomain()
    }
  })
}

describe('reader methods', () => {
  describe('#read', () => {
    // The following tests only check for basic reading errors.
    // This is done by returning the Promise directly to Mocha which can handle it.
    
    it('should read a CoverageJSON Coverage in JSON format', () => {
      return readall(FIXTURES.ProfileURL)
    })
    it('should read a CoverageJSON CoverageCollection in JSON format', () => {
      return readall(FIXTURES.CollectionURL)
    })
    it('should read a CoverageJSON Coverage in object format', () => {
      return readall(FIXTURES.Profile())
    })
    it('should read a CoverageJSON CoverageCollection in object format', () => {
      return readall(FIXTURES.CollectionEmpty())
    })
    it('Coverage should have correct properties', () => {
      return read(FIXTURES.Profile()).then(cov => {
        assert.equal(cov.type, PREFIX + FIXTURES.Profile().type)
        assert.equal(cov.domainType, PREFIX + FIXTURES.Profile().domain.type)
        let label = cov.parameters.get('PSAL').observedProperty.label
        assert(label.has('en'), 'en label missing')
        assert.equal(label.get('en'), 'Sea Water Salinity')
      })
    })
  })
})

describe('Coverage methods', () => {
  describe('#subsetByIndex', () => {
    it('should not modify the original coverage', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: 0}).then(subset => {
          return Promise.all([cov.loadDomain(), cov.loadRange('PSAL')]).then(([domain,range]) => {
            assert.equal(domain.z.length, 2)
            assert.deepEqual(range.values.shape, [2])
          })
        })
      })
    })
    let vals = FIXTURES.Profile().ranges.PSAL.values
    it('should subset correctly, variant 1', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: 1}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.z.length, 1)
            assert.deepEqual(range.values.shape, [1])
            assert.strictEqual(range.values.get(0), vals[1])
          })
        })
      })
    })
    it('should subset correctly, variant 2', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: {start: 0, stop: 1}}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.z.length, 1)
            assert.deepEqual(range.values.shape, [1])
            assert.strictEqual(range.values.get(0), vals[0])
          })
        })
      })
    })
    it('should subset correctly, variant 3', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: [0]}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.z.length, 1)
            assert.deepEqual(range.values.shape, [1])
            assert.strictEqual(range.values.get(0), vals[0])
          })
        })
      })
    })
    it('should subset correctly, variant 3', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: [0,1]}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.z.length, 2)
            assert.deepEqual(range.values.shape, [2])
            assert.strictEqual(range.values.get(0), vals[0])
            assert.strictEqual(range.values.get(1), vals[1])
          })
        })
      })
    })
    // TODO write more tests which cover things like {z: [0,2]} and real multidim domains
    
  })
})
