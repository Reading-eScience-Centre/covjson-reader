export const PREFIX = 'http://coveragejson.org/def#'

export function assert (condition, message) {
  if (!condition) {
    message = message || 'Assertion failed'
    throw new Error(message)
  }
}

export function shallowcopy (obj) {
  let copy = {}
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

export function minMax (arr) {
  var len = arr.length
  var min = Infinity
  var max = -Infinity
  while (len--) {
    var el = arr[len]
    if (el == null) {
      // do nothing
    } else if (el < min) {
      min = el
    } else if (el > max) {
      max = el
    }
  }
  if (min === Infinity) {
    min = max
  } else if (max === -Infinity) {
    max = min
  }
  if (min === Infinity) {
    // all values were null
    min = null
    max = null
  }
  return [min, max]
}