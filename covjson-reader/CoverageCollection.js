import Coverage from './Coverage.js'
import {shallowcopy} from './util.js'

export default class CoverageCollection {
  constructor(covjson) {
    this._exposeLd(covjson)
    this.id = covjson.id
    let covs = []
    let rootParams = covjson.parameters ? covjson.parameters : {}
    for (let coverage of covjson.coverages) {
      if (coverage.parameters) {
        for (let key of Object.keys(rootParams)) {
          if (key in coverage.ranges) {
            coverage.parameters[key] = rootParams[key]
          }
        }
      } else {
        coverage.parameters = rootParams
      } 
      covs.push(new Coverage(coverage))
    }
    this.coverages = covs
    if (covjson.parameters) {
      this.parameters = covjson.parameters
    }
  }
  
  _exposeLd (covjson) {
    if (!covjson['@context']) {
      // no LD love here...
      this.ld = {}
      return
    }
    // make a deep copy since the object gets modified in-place later
    // but first, remove the coverages (those have their own .ld property)
    let copy = shallowcopy(covjson)
    delete copy.coverages
    this.ld = JSON.parse(JSON.stringify(copy))
  }
}
