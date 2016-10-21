// IE11 support
import 'core-js/es6/promise'
import 'core-js/es6/symbol'
import 'core-js/es6/map'
import 'core-js/modules/es6.array.from'

import assert from 'assert'

import {read} from '../src/reader.js'
import {DOMAIN} from '../src/constants.js'

import {FIXTURES} from './data.js'

describe('Domain structure', () => {
  it('should have correct structure', () => {
    return read(FIXTURES.GridRegularDomain()).then(domain => {
      assert.equal(domain.type, DOMAIN)
    })
  })      
})
