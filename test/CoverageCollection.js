import assert from 'assert'

import {read} from '../src/reader.js'
import {COVERAGECOLLECTION} from '../src/constants.js'

import {FIXTURES} from './data.js'

describe('CoverageCollection structure', () => {
  it('should have correct structure', () => {
    return read(FIXTURES.CollectionURL).then(coll => {
      assert.equal(coll.type, COVERAGECOLLECTION)
      let paramId = coll.parameters.get('PSAL').id
      assert(paramId) // not empty
      for (let cov of coll.coverages) {
        assert.strictEqual(cov.parameters.get('PSAL').id, paramId)
      }
    })
  })

})

describe('CoverageCollection methods', () => {
  describe('#query', () => {
    it('should query correctly', () => {
      return read(FIXTURES.CollectionURL).then(coll => {
        return coll.query()
          .filter({z: {start: 0, stop: 4}})
          .subset({z: {start: 4, stop: 7}})
          .execute().then(newcoll => {
            assert.equal(coll.type, COVERAGECOLLECTION)
            assert.strictEqual(newcoll.coverages.length, 1)
            let cov = newcoll.coverages[0]
            return cov.loadDomain().then(domain => {
              assert.deepEqual(domain.axes.get('z').values, [4, 7])
            })
          })
      })
    })
  })
})
