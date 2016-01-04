// IE11 support
import 'core-js/es6/array'
import 'core-js/es6/promise'
import 'core-js/es6/symbol'
import 'core-js/es6/map'

import assert from 'assert'

import {read} from '../src/reader.js'

import {FIXTURES} from './data.js'

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
    it('should return a subsettable coverage again', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: 0}).then(subset => {
          return subset.subsetByIndex({z: 0})
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
  })
  describe('#subsetByValue', () => {
    let vals = FIXTURES.Grid().domain.axes.x.values
    it('should subset correctly, exact match', () => {
      return read(FIXTURES.Grid()).then(cov => {
        return cov.subsetByValue({x: -5}).then(subset => {
          return subset.loadDomain().then(domain => {
            assert.deepEqual(domain.axes.get('x').values, [-5])
          })
        })
      })
    })
    it('should subset correctly, exact time match', () => {
      return read(FIXTURES.Grid()).then(cov => {
        let time = '2010-01-01T00:12:20.0Z' // not identical to domain string! has millis
        return cov.subsetByValue({t: time}).then(subset => {
          return subset.loadDomain().then(domain => {
            assert.strictEqual(domain.axes.get('t').values.length, 1)
            assert.strictEqual(new Date(domain.axes.get('t').values[0]).getTime(),
                               new Date(time).getTime())
          })
        })
      })
    })
    it('should subset correctly, exact time match 2', () => {
      return read(FIXTURES.Grid()).then(cov => {
        let time = new Date('2010-01-01T00:12:20Z')
        return cov.subsetByValue({t: time}).then(subset => {
          return subset.loadDomain().then(domain => {
            assert.strictEqual(domain.axes.get('t').values.length, 1)
            assert.strictEqual(new Date(domain.axes.get('t').values[0]).getTime(),
                               time.getTime())
          })
        })
      })
    })
    it('should subset correctly, by target', () => {
      return read(FIXTURES.Grid()).then(cov => {
        return cov.subsetByValue({x: {target: -4}}).then(subset => {
          return subset.loadDomain().then(domain => {
            assert.deepEqual(domain.axes.get('x').values, [-5])
          })
        })
      })
    })
    it('should subset correctly, by start/stop', () => {
      return read(FIXTURES.Grid()).then(cov => {
        return cov.subsetByValue({x: {start: -5, stop: 5}}).then(subset => {
          return subset.loadDomain().then(domain => {
            assert.deepEqual(domain.axes.get('x').values, [-5,0])
          })
        })
      })
    })
  })
})
