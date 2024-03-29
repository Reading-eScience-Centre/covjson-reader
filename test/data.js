let base = 'http://localhost:9876/fixtures/'

export const FIXTURES = {
    ProfileURL: base + 'Coverage-Profile-standalone.covjson',
    CollectionURL: base + 'VerticalProfileCoverageCollection-standalone.covjson',
    GridCategoricalURL: base + 'Coverage-Grid-categorical-standalone.covjson',
    GridTiledURL: base + 'Coverage-Grid-tiled.covjson',
    Profile: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "VerticalProfile",
        "axes": {
          "x": { "values": [-10.1] },
          "y": { "values": [-40.2] },
          "z": { "values": [ 5.4562, 8.9282 ] },
          "t": { "values": ["2013-01-13T11:12:20Z"] }
        },
        "referencing": [{
          "coordinates": ["x","y"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          }
        }, {
          "coordinates": ["z"],
          "system": {
            "type": "VerticalCRS",
            "cs": {
              "axes": [{
                "name": {
                  "en": "Pressure"
                },
                "direction": "down",
                "unit": {
                  "symbol": "Pa"
                }
              }]
            }
          }
        }, {
          "coordinates": ["t"],
          "system": {
            "type": "TemporalRS",
            "calendar": "Gregorian"
          }
        }]
      },
      "parameters" : {
        "PSAL": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "psu"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Water Salinity"
            }
          }
        }
      },
      "ranges" : {
        "PSAL" : {
          "type" : "NdArray",
          "dataType": "float",
          "shape": [2],
          "axisNames": ["z"],
          "values" : [ 43.9599, 43.3599 ]
        }
      }
    }),
    ProfileWithDomainType: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "VerticalProfile",
        "axes": {
          "x": { "values": [-10.1] },
          "y": { "values": [-40.2] },
          "z": { "values": [ 5.4562, 8.9282 ] },
          "t": { "values": ["2013-01-13T11:12:20Z"] }
        },
        "referencing": [{
          "coordinates": ["x","y"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          }
        }, {
          "coordinates": ["z"],
          "system": {
            "type": "VerticalCRS",
            "cs": {
              "axes": [{
                "name": {
                  "en": "Pressure"
                },
                "direction": "down",
                "unit": {
                  "symbol": "Pa"
                }
              }]
            }
          }
        }, {
          "coordinates": ["t"],
          "system": {
            "type": "TemporalRS",
            "calendar": "Gregorian"
          }
        }]
      },
      "parameters" : {
        "PSAL": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "psu"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Water Salinity"
            }
          }
        }
      },
      "ranges" : {
        "PSAL" : {
          "type" : "Range",
          "dataType": "float",
          "shape": [2],
          "axisNames": ["z"],
          "values" : [ 43.9599, 43.3599 ]
        }
      }
    }),
    ProfileNdArrayOnlyZ: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "VerticalProfile",
        "axes": {
          "x": { "values": [-10.1] },
          "y": { "values": [-40.2] },
          "z": { "values": [ 5.4562, 8.9282 ] }
        },
        "referencing": [{
          "coordinates": ["x","y"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          }
        }, {
          "coordinates": ["z"],
          "system": {
            "type": "VerticalCRS",
            "cs": {
              "axes": [{
                "name": {
                  "en": "Pressure"
                },
                "direction": "down",
                "unit": {
                  "symbol": "Pa"
                }
              }]
            }
          }
        }]
      },
      "parameters" : {
        "PSAL": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "psu"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Water Salinity"
            }
          }
        }
      },
      "ranges" : {
        "PSAL" : {
          "type" : "NdArray",
          "dataType": "float",
          "shape": [2],
          "axisNames": ['z'],
          "values" : [ 43.9599, 43.3599 ]
        }
      }
    }),
    Grid: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "Grid",
        "axes": {
          "x": { "values": [-10,-5,0], "bounds": [-12.5,-7.5, -7.5,-2.5, -2.5,2.5] },
          "y": { "values": [40,50], "bounds": [35,45, 45,55] }, 
          "z": { "values": [5] },
          "t": { "values": ["2010-01-01T00:12:20Z"] }
        },
        "referencing": [{
          "coordinates": ["y","x","z"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/EPSG/0/4979"
          }
        }, {
          "coordinates": ["t"],
          "system": {
            "type": "TemporalRS",
            "calendar": "Gregorian"
          }
        }]
      },
      "parameters" : {
        "ICEC": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "fraction"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Ice Concentration"
            }
          }
        }
      },
      "ranges" : {
        "ICEC" : {
          "type" : "NdArray",
          "dataType": "float",
          "axisNames": ["t","z","y","x"],
          "shape": [1, 1, 2, 3],
          "values" : [ 0.5, 0.6, 0.4, 0.6, 0.2, null ]
        }
      }
    }),
    GridRegular: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "Grid",
        "axes": {
          "x": { "values": [-10,-5,0] },
          "y": { "start": 40, "stop": 50, "num": 2 },
          "z": { "values": [5] },
          "t": { "values": ["2010-01-01T00:12:20Z"] }
        },
        "referencing": [{
          "coordinates": ["y","x","z"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/EPSG/0/4979"
          }
        }, {
          "coordinates": ["t"],
          "system": {
            "type": "TemporalRS",
            "calendar": "Gregorian"
          }
        }]
      },
      "parameters" : {
        "ICEC": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "fraction"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Ice Concentration"
            }
          }
        }
      },
      "ranges" : {
        "ICEC" : {
          "type" : "NdArray",
          "dataType": "float",
          "axisNames": ["t","z","y","x"],
          "shape": [1, 1, 2, 3],
          "values" : [ 0.5, 0.6, 0.4, 0.6, 0.2, null ]
        }
      }
    }),
    GridRegularDomain: () => ({
      "type" : "Domain",
      "domainType" : "Grid",
      "axes": {
        "x": { "values": [-10,-5,0] },
        "y": { "start": 40, "stop": 50, "num": 2 },
        "z": { "values": [5] },
        "t": { "values": ["2010-01-01T00:12:20Z"] }
      },
      "referencing": [{
        "coordinates": ["y","x","z"],
        "system": {
          "type": "GeodeticCRS",
          "id": "http://www.opengis.net/def/crs/EPSG/0/4979"
        }
      }, {
        "coordinates": ["t"],
        "system": {
          "type": "TemporalRS",
          "calendar": "Gregorian"
        }
      }]
    }),
    GridNewRange: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "Grid",
        "axes": {
          "x": { "values": [-10,-5,0] },
          "y": { "values": [40,50] },
          "z": { "values": [5] },
          "t": { "values": ["2010-01-01T00:12:20Z"] }
        },
        "referencing": [{
          "coordinates": ["y","x","z"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/EPSG/0/4979"
          }
        }, {
          "coordinates": ["t"],
          "system": {
            "type": "TemporalRS",
            "calendar": "Gregorian"
          }
        }]
      },
      "parameters" : {
        "ICEC": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "fraction"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Ice Concentration"
            }
          }
        }
      },
      "ranges" : {
        "ICEC" : {
          "type" : "NdArray",
          "dataType": "float",
          "axisNames": ["t","z","y","x"],
          "shape": [1, 1, 2, 3],
          "values" : [ 0.5, 0.6, 0.4, 0.6, 0.2, null ]
        }
      }
    }),
    Point: () => ({
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType" : "Point",
        "axes": {
          "x": { "values": [-10.1] },
          "y": { "values": [-40.2] }
        },
        "referencing": [{
          "coordinates": ["x","y"],
          "system": {
            "type": "GeodeticCRS",
            "id": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
          }
        }]
      },
      "parameters" : {
        "PSAL": {
          "type" : "Parameter",
          "unit" : {
            "symbol" : "psu"
          },
          "observedProperty" : {
            "label" : {
              "en": "Sea Water Salinity"
            }
          }
        }
      },
      "ranges" : {
        "PSAL" : {
          "type" : "NdArray",
          "dataType": "float",
          "values" : [ 43.9599 ]
        }
      }
    }),
    CollectionEmpty: () => ({
      "type" : "CoverageCollection",
      "coverages": []
    })
}
