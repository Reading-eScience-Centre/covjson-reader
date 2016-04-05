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

export function endsWith (subject, search) {
  // IE support
  let position = subject.length - search.length
  let lastIndex = subject.indexOf(search, position)
  return lastIndex !== -1 && lastIndex === position
}
