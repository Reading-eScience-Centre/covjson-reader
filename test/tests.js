import assert from 'assert'

import read from 'covjson-reader/reader'
import {PREFIX} from 'covjson-reader/reader'

const FIXTURES = {
    ProfileURL: 'base/test/fixtures/Coverage-Profile-standalone.covjson',
    CollectionURL: 'base/test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson',
    Profile: {
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
          "values" : [ 43.9599, 43.9599 ]
        }
      }
    },
    CollectionEmpty: {
      "type" : "CoverageCollection",
      "coverages": []
    }
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
  let server

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
      return readall(FIXTURES.Profile)
    })
    it('should read a CoverageJSON CoverageCollection in object format', () => {
      return readall(FIXTURES.CollectionEmpty)
    })
    it('Coverage should have correct properties', done => {
      read(FIXTURES.Profile).then(cov => {
        assert.equal(cov.type, PREFIX + FIXTURES.Profile.type)
        assert.equal(cov.domainType, PREFIX + FIXTURES.Profile.domain.type)
        let label = cov.parameters.get('PSAL').observedProperty.label
        assert(label.has('en'))
        assert.equal(label.get('en'), 'Sea Water Salinity')
        done()
      })
    })
  })
})
