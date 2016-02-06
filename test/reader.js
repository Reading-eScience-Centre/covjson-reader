// IE11 support
import 'core-js/es6/array'
import 'core-js/es6/promise'
import 'core-js/es6/symbol'
import 'core-js/es6/map'

import assert from 'assert'

import {read} from '../lib/reader.js'
import {PREFIX} from '../lib/util.js'

import {runServerIfNode} from './node-setup.js'
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
  
  runServerIfNode()
  
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
        assert.deepEqual(cov.profiles, [PREFIX + FIXTURES.Profile().profile])
        assert.deepEqual(cov.domainProfiles, [PREFIX + FIXTURES.Profile().domain.profile])
        let label = cov.parameters.get('PSAL').observedProperty.label
        assert(label.en, 'en label missing')
        assert.equal(label.en, 'Sea Water Salinity')
      })
    })
    it('Categorical coverage should have correct properties', () => {
      return read(FIXTURES.GridCategoricalURL).then(cov => {
        let param = cov.parameters.get('LC')
        let cats = param.observedProperty.categories
        // cats.find(c => c.id === 'http://.../landcover1/categories/grass')
        let grass = cats[0] // IE11 compatible
        assert(grass.label.en, 'en label missing')
        assert.equal(grass.label.en, 'Grass')
        assert(grass.description.en, 'en description missing')
        assert.equal(grass.description.en, 'Very green grass.')
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
