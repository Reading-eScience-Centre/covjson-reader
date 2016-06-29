// IE11 support
import 'core-js/es6/array'
import 'core-js/es6/promise'
import 'core-js/es6/symbol'
import 'core-js/es6/map'

import assert from 'assert'
import xndarray from 'xndarray'

import {read} from '../lib/reader.js'
import {COVERAGE} from '../lib/constants.js'
import {DOMAINTYPES_PREFIX as PREFIX} from '../lib/util.js'

import {runServerIfNode} from './node-setup.js'
import {FIXTURES} from './data.js'

// copy of grid-tiled/c/all.covjson 
let tiledAllVals = xndarray([
   1,  2,  3,  4,  5,  6,  7,  8,  9, 10,
   11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
   21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
   31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
   41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
   
   51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
   61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
   71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
   81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
   91, 92, 93, 94, 95, 96, 97, 98, 99, 100], 
   {names: ['t','y','x'], shape: [2, 5, 10]})

describe('Coverage structure', () => {
  runServerIfNode()
  
  it('should have loaded=true and type=Coverage', () => {
    return read(FIXTURES.Profile()).then(cov => {
      assert.equal(cov.loaded, true)
      assert.equal(cov.type, COVERAGE)
      assert.equal(cov.domainType, PREFIX + 'VerticalProfile')
    })
  })
  it('should support 0D NdArrays', () => {
    let vals = FIXTURES.Point().ranges.PSAL.values
    return read(FIXTURES.Point()).then(cov => {
      return Promise.all([cov.loadDomain(), cov.loadRange('PSAL')]).then(([domain,range]) => {
        assert.strictEqual(domain.axes.size, 2)
        assert.strictEqual(range.get({}), vals[0])
      })
    })
  })
  it('should support leaving out fixed axes in NdArrays', () => {
    let vals = FIXTURES.ProfileNdArrayOnlyZ().ranges.PSAL.values
    return read(FIXTURES.ProfileNdArrayOnlyZ()).then(cov => {
      return Promise.all([cov.loadDomain(), cov.loadRange('PSAL')]).then(([domain,range]) => {
        assert.strictEqual(domain.axes.size, 3)
        assert.strictEqual(range.get({z: 0}), vals[0])
        assert.strictEqual(range.get({z: 1}), vals[1])
      })
    })
  })
  it('should support loading a tiled range', () => {
    return read(FIXTURES.GridTiledURL).then(cov => {
      // TODO how to check which tileset was loaded?
      return cov.loadRange('FOO').then(range => {
        for (let t=0; t < tiledAllVals.shape[0]; t++) {
          for (let y=0; y < tiledAllVals.shape[1]; y++) {
            for (let x=0; x < tiledAllVals.shape[2]; x++) {
              assert.strictEqual(range.get({t, y, x}), tiledAllVals.xget({t, y, x}))
            }
          }
        }
      })
    })
  })
})

describe('Coverage methods', () => {
  runServerIfNode()
  
  describe('#subsetByIndex', () => {
    it('should not modify the original coverage', () => {
      return read(FIXTURES.Profile()).then(cov => {
        return cov.subsetByIndex({z: 0}).then(subset => {
          assert.equal(subset.type, COVERAGE)
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
            assert.deepEqual(domain.axes.get('y').bounds.get(0), [dom.axes.y.bounds[2],dom.axes.y.bounds[3]])
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
    it('should subset correctly, new range encoding', () => {
      let dom = FIXTURES.GridNewRange().domain
      let vals = FIXTURES.GridNewRange().ranges.ICEC.values
      return read(FIXTURES.GridNewRange()).then(cov => {
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
    it('should subset correctly, new range encoding (leaving out fixed axes)', () => {
      let dom = FIXTURES.ProfileNdArrayOnlyZ().domain
      let vals = FIXTURES.ProfileNdArrayOnlyZ().ranges.PSAL.values
      return read(FIXTURES.ProfileNdArrayOnlyZ()).then(cov => {
        // the subset doesn't do anything here, it should just not fail!
        return cov.subsetByIndex({x: 0, y: 0}).then(subset => {
          return Promise.all([subset.loadDomain(), subset.loadRange('PSAL')]).then(([domain,range]) => {
            assert.deepEqual(domain.axes.get('x').values, dom.axes.x.values)
            assert.deepEqual(domain.axes.get('y').values, dom.axes.y.values)
            assert.deepEqual(domain.axes.get('z').values, dom.axes.z.values)
            assert.strictEqual(range.get({x: 0, y: 0, z: 0}), vals[0])
            assert.strictEqual(range.get({x: 0, y: 0, z: 1}), vals[1])
          })
        })
      })
    })
    it('should subset a tiled range correctly', () => {
      return read(FIXTURES.GridTiledURL).then(cov => {
        // TODO how to check which tileset was loaded?
        let constraint = {t: {start: 1, stop: 2}, y: {start: 2, stop: 4}, x: {start: 0, stop: 3}}
        return cov.subsetByIndex(constraint).then(subset => {
          return subset.loadRange('FOO').then(range => {
            for (let t=0; t < 1; t++) {
              for (let y=0; y < 2; y++) {
                for (let x=0; x < 3; x++) {
                  assert.strictEqual(range.get({t, y, x}), 
                                     tiledAllVals.xget({
                                       t: t + constraint.t.start,
                                       y: y + constraint.y.start,
                                       x: x + constraint.x.start}))
                }
              }
            }
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
