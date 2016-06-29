export {minMax, indicesOfNearest, indexOfNearest} from 'covutils/lib/array.js'

const PREFIX = 'http://covjson.org/def/'
export const CORE_PREFIX = PREFIX + 'core#'
export const DOMAINTYPES_PREFIX = PREFIX + 'domainTypes#'

/**
 * @ignore
 */
export function assert (condition, message) {
  if (!condition) {
    message = message || 'Assertion failed'
    throw new Error(message)
  }
}

/**
 * @ignore
 */
export function shallowcopy (obj) {
  let copy = Object.create(Object.getPrototypeOf(obj))
  for (let prop in obj) {
    copy[prop] = obj[prop]
  }
  return copy
}

/**
 * Extracts all the directly included namespaces from the `@context` field,
 * not following remote JSON-LD contexts.
 * 
 * @ignore
 * @param doc A JSON-LD document. 
 * @returns {Map<string,string>} 
 */
export function getNamespacePrefixes (doc) {
  let context = doc['@context']
  if (!context) {
    return
  }
  if (!Array.isArray(context)) {
    context = [context]
  }
  let prefixes = new Map()
  for (let item of context) {
    if (typeof item === 'string') {
      continue
    }
    for (let key of Object.keys(item)) {
      if (typeof item[key] === 'string') {
        prefixes.set(key, item[key])
      }
    }
  }
  return prefixes
}