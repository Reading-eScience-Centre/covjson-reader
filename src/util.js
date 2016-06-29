export {minMax, indicesOfNearest, indexOfNearest} from 'covutils/lib/array.js'

export const PREFIX = 'http://coveragejson.org/def#'

export function assert (condition, message) {
  if (!condition) {
    message = message || 'Assertion failed'
    throw new Error(message)
  }
}

export function shallowcopy (obj) {
  let copy = Object.create(Object.getPrototypeOf(obj))
  for (let prop in obj) {
    copy[prop] = obj[prop]
  }
  return copy
}
