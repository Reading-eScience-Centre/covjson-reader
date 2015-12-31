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

export function mergeInto (inputObj, targetObj) {
  for (let k of Object.keys(inputObj)) {
    targetObj[k] = inputObj[k]
  }
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

/***
 * Return the indices of the two neighbors in the a array closest to x.
 * The array must be sorted (strictly monotone), either ascending or descending.
 * 
 * If x exists in the array, both neighbors point to x.
 * If x is lower (greater if descending) than the first value, both neighbors point to 0.
 * If x is greater (lower if descending) than the last value, both neighbors point to the last index.
 * 
 * Adapted from https://stackoverflow.com/a/4431347
 */
export function indicesOfNearest (a, x) {
  if (a.length === 0) {
    throw new Error('Array must have at least one element')
  }
  var lo = -1
  var hi = a.length
  const ascending = a.length === 1 || a[0] < a[1]
  // we have two separate code paths to help the runtime optimize the loop
  if (ascending) {
    while (hi - lo > 1) {
      let mid = Math.round((lo + hi) / 2)
      if (a[mid] <= x) {
        lo = mid
      } else {
        hi = mid
      }
    }
  } else {
    while (hi - lo > 1) {
      let mid = Math.round((lo + hi) / 2)
      if (a[mid] >= x) { // here's the difference
        lo = mid
      } else {
        hi = mid
      }
    }
  }
  if (a[lo] === x) hi = lo
  if (lo === -1) lo = hi
  if (hi === a.length) hi = lo
  return [lo, hi]
}

/**
 * Return the index in a of the value closest to x.
 * The array a must be sorted, either ascending or descending.
 * If x happens to be exactly between two values, the one that
 * appears first is returned.
 */
export function indexOfNearest (a, x) {
  var i = indicesOfNearest(a, x)
  var lo = i[0]
  var hi = i[1]
  if (Math.abs(x - a[lo]) <= Math.abs(x - a[hi])) {
    return lo
  } else {
    return hi
  }
}

/**
 * Returns true if the given axis has ISO8601 date strings
 * as axis values.
 */
export function isISODateAxis (domain, axisName) {
  let val = domain.axes.get(axisName).values[0]
  if (typeof val !== 'string') {
    return false
  }
  return !isNaN(new Date(val).getTime())
}

export function asTime (inp) {
  let res
  let err = false
  if (typeof inp === 'string') {
    res = new Date(inp).getTime()
  } else if (inp instanceof Date) {
    res = inp.getTime()
  } else {
    err = true
  }
  if (isNaN(res)) {
    err = true
  }
  if (err) {
    throw new Error('Invalid date: ' + inp)
  }
  return res
}
