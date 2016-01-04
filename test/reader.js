import assert from 'assert'

import {read} from '../src/reader.js'
import {PREFIX} from '../src/util.js'

import {FIXTURES} from './data.js'

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
    it('Regular axis in coverage should expand correctly', () => {
      return read(FIXTURES.GridRegular()).then(cov => {
        return cov.loadDomain().then(domain => {
          assert.deepEqual(domain.axes.get('y').values, [40, 50])
        })
      })
    })
  })
})
