const OPENGIS_CRS_PREFIX = 'http://www.opengis.net/def/crs/'

/** 3D WGS84 in lat-lon-height order */
const EPSG4979 = OPENGIS_CRS_PREFIX + '/EPSG/0/4979'

/** 2D WGS84 in lat-lon order */
const EPSG4326 = OPENGIS_CRS_PREFIX + '/EPSG/0/4326'

/** 2D WGS84 in lon-lat order */
const CRS84 = OPENGIS_CRS_PREFIX + '/OGC/1.3/CRS84'
  
/** CRSs in which position is specified by geodetic latitude and longitude */
const EllipsoidalCRSs = [EPSG4979, EPSG4326, CRS84]

/** Position of longitude axis */ 
const LongitudeAxisIndex = {
  [EPSG4979]: 1,
  [EPSG4326]: 1,
  [CRS84]: 0
}

/**
 * Returns a function which converts an arbitrary longitude to the
 * longitude extent used in the coverage domain.
 * This only supports primitive axes since this is what subsetByValue supports.
 * The longitude extent is extended to 360 degrees if the actual extent is smaller.
 * The extension is done equally on both sides of the extent. 
 * 
 * For example, the domain may have longitudes within [0,360].
 * An input longitude of -70 is converted to 290.
 * All longitudes within [0,360] are returned unchanged.
 * 
 * If the domain has longitudes within [10,50] then the
 * extended longitude range is [-150,210] (-+180 from the middle point).
 * An input longitude of -170 is converted to 190.
 * All longitudes within [-150,210] are returned unchanged.
 * 
 * @ignore
 */
export function getLongitudeWrapper (domain, axisName) {
  // for primitive axes, the axis identifier = component identifier
  if (!isLongitudeComponent(domain, axisName)) {
    throw new Error(`'${axisName}' is not a longitude axis`)
  }
  
  let vals = domain.axes.get(axisName).values
  let lon_min = vals[0]
  let lon_max = vals[vals.length-1]
  if (lon_min > lon_max) {
    [lon_min,lon_max] = [lon_max,lon_min]
  }
  
  let x_mid = (lon_max + lon_min) / 2
  let x_min = x_mid - 180
  let x_max = x_mid + 180
  
  return lon => {
    if (x_min <= lon && lon <= x_max) {
      // directly return to avoid introducing rounding errors
      return lon
    } else {
      return ((lon - x_min) % 360 + 360) % 360 + x_min
    }
}

/**
 * Return whether the given domain component represents longitudes.
 * 
 * @ignore
 */
export function isLongitudeAxis (domain, axisName) {
  let ref = getReferenceObject(domain, [axisName])
  if (!ref) {
    return false
  }
  
  let crsId = ref.system.id
  // TODO should support unknown CRSs with embedded axis information
  if (EllipsoidalCRSs.indexOf(crsId) === -1) {
    // this also covers the case when there is no ID property
    return false
  }
  
  let compIdx = ref.components.indexOf(component)
  let isLongitude = LongitudeAxisIndex[crsId] === compIdx
  return isLongitude
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

/**
 * Return the reference system connection object for the given domain component,
 * or undefined if none exists.
 */
function getReferenceObject (domain, component) {
  let ref = domain.referencing.find(ref => ref.components.indexOf(component) !== -1)
  return ref
}
