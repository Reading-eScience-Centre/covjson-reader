import assert from 'assert'

import {read} from 'covjson-reader/reader'
import {PREFIX} from 'covjson-reader/util'

const FIXTURES = {
    ProfileURL: 'base/test/fixtures/Coverage-Profile-standalone.covjson',
    CollectionURL: 'base/test/fixtures/CoverageCollection-Point-param_in_collection-standalone.covjson',
    GridCategoricalURL: 'base/test/fixtures/Coverage-Grid-categorical-standalone.covjson',
    Profile: () => ({
      "type" : "Coverage",
      "profile" : "VerticalProfileCoverage",
      "domain" : {
        "type" : "Domain",
        "profile" : "VerticalProfile",
        "axes": {
          "x": { "values": [-10.1] },
          "y": { "values": [-40.2] },
          "z": { "values": [ 5.4562, 8.9282 ] },
          "t": { "values": ["2013-01-13T11:12:20Z"] }
        }
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
          "dataType": "float",
          "values" : [ 43.9599, 43.3599 ]
        }
      }
    }),
    Grid: () => ({
      "type" : "Coverage",
      "profile" : "GridCoverage",
      "domain" : {
        "type" : "Domain",
        "profile" : "Grid",
        "axes": {
          "x": { "values": [-10,-5,0] },
          "y": { "values": [40,50] },
          "z": { "values": [5] },
          "t": { "values": ["2010-01-01T00:12:20Z"] }
        },
        "rangeAxisOrder": ["t","z","y","x"]
      },
      "parameters" : {
        "ICEC": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "fraction"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Ice Concentration"
            }
          }
        }
      },
      "ranges" : {
        "type" : "RangeSet",
        "ICEC" : {
          "type" : "Range",
          "dataType": "float",
          "values" : [ 0.5, 0.6, 0.4, 0.6, 0.2, null ],
          "validMin" : 0,
          "validMax" : 1
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
    if (!cov.coverages) {
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
        assert.equal(cov.type, PREFIX + FIXTURES.Profile().profile)
        assert.equal(cov.domainType, PREFIX + FIXTURES.Profile().domain.profile)
        let label = cov.parameters.get('PSAL').observedProperty.label
        assert(label.has('en'), 'en label missing')
        assert.equal(label.get('en'), 'Sea Water Salinity')
      })
    })
    it('Categorical coverage should have correct properties', () => {
      return read(FIXTURES.GridCategoricalURL).then(cov => {
        let param = cov.parameters.get('LC')
        let cats = param.observedProperty.categories
        // cats.find(c => c.id === 'http://.../landcover1/categories/grass')
        let grass = cats[0] // IE11 compatible
        assert(grass.label.has('en'), 'en label missing')
        assert.equal(grass.label.get('en'), 'Grass')
        assert(grass.description.has('en'), 'en description missing')
        assert.equal(grass.description.get('en'), 'Very green grass.')
        assert.deepEqual(param.categoryEncoding.get(grass.id), [1])
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
            assert.strictEqual(domain.axes.size, 4)
            assert.strictEqual(domain.axes.get('z').values.length, 2)
            assert.strictEqual(range.shape.get('z'), 2)
          })
        })
      })
    })
    let vals = FIXTURES.Profile().ranges.PSAL.values
    it('should subset correctly, variant 1', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: 1}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.axes.get('z').values.length, 1)
            assert.strictEqual(range.shape.get('z'), 1)
            assert.strictEqual(range.get({z: 0}), vals[1])
          })
        })
      })
    })
    it('should subset correctly, variant 2', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: {start: 0, stop: 1}}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.axes.get('z').values.length, 1)
            assert.strictEqual(range.shape.get('z'), 1)
            assert.strictEqual(range.get({z: 0}), vals[0])
          })
        })
      })
    })
    it('should subset correctly, variant 3', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: [0]}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.axes.get('z').values.length, 1)
            assert.strictEqual(range.shape.get('z'), 1)
            assert.strictEqual(range.get({z: 0}), vals[0])
          })
        })
      })
    })
    it('should subset correctly, variant 4', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: [0,1]}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.strictEqual(domain.axes.get('z').values.length, 2)
            assert.strictEqual(range.shape.get('z'), 2)
            assert.strictEqual(range.get({z: 0}), vals[0])
            assert.strictEqual(range.get({z: 1}), vals[1])
          })
        })
      })
    })
    it('should subset correctly, variant 5', () => {
      let dom = FIXTURES.Grid().domain
      let vals = FIXTURES.Grid().ranges.ICEC.values
      return read(FIXTURES.Grid()).then(cov => {
        return cov.subsetByIndex({x: [1,2], y: 1}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('ICEC')]).then(([domain,range]) => {
            assert.deepEqual(domain.axes.get('x').values, dom.axes.x.values.slice(1))
            assert.deepEqual(domain.axes.get('y').values, dom.axes.y.values.slice(1))
            assert.deepEqual(domain.axes.get('z').values, dom.axes.z.values)
            assert.deepEqual(domain.axes.get('t').values, dom.axes.t.values)
            assert.strictEqual(range.shape.size, 4)
            assert.strictEqual(range.shape.get('x'), 2)
            assert.strictEqual(range.shape.get('y'), 1)
            assert.strictEqual(range.shape.get('z'), 1)
            assert.strictEqual(range.shape.get('t'), 1)
            assert.strictEqual(range.get({x: 0, y: 0, t: 0, z: 0}), vals[4])
            assert.strictEqual(range.get({x: 1, y: 0, t: 0, z: 0}), vals[5])
          })
        })
      })
    })
    it('should subset correctly, variant 6', () => {
      let dom = FIXTURES.Grid().domain
      let vals = FIXTURES.Grid().ranges.ICEC.values
      return read(FIXTURES.Grid()).then(cov => {
        return cov.subsetByIndex({x: {start: 1, stop: 3}, y: 1}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('ICEC')]).then(([domain,range]) => {
            assert.deepEqual(domain.axes.get('x').values, dom.axes.x.values.slice(1))
            assert.deepEqual(domain.axes.get('y').values, dom.axes.y.values.slice(1))
            assert.deepEqual(domain.axes.get('z').values, dom.axes.z.values)
            assert.deepEqual(domain.axes.get('t').values, dom.axes.t.values)
            assert.strictEqual(range.shape.size, 4)
            assert.strictEqual(range.shape.get('x'), 2)
            assert.strictEqual(range.shape.get('y'), 1)
            assert.strictEqual(range.shape.get('z'), 1)
            assert.strictEqual(range.shape.get('t'), 1)
            assert.strictEqual(range.get({x: 0, y: 0, t: 0, z: 0}), vals[4])
            assert.strictEqual(range.get({x: 1, y: 0, t: 0, z: 0}), vals[5])
          })
        })
      })
    })
    
    /* not implemented yet
    it('should subset correctly, variant 7', () => {
      let dom = FIXTURES.Grid().domain
      let vals = FIXTURES.Grid().ranges.ICEC.values
      return read(FIXTURES.Grid()).then(cov => {
        return cov.subsetByIndex({x: [0,2]}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('ICEC')]).then(([domain,range]) => {
            assert.deepEqual(domain.x, [dom.x[0], dom.x[2]])
            assert.deepEqual(domain.y, dom.y)
            assert.deepEqual(domain.z, dom.z)
            assert.deepEqual(domain.t, dom.t)
            assert.deepEqual(domain.shape, [1,1,2,2])
            assert.deepEqual(range.values.shape, [1,1,2,2])
          })
        })
      })
    })
    */
    
  })
})
