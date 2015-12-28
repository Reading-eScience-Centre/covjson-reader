export const FIXTURES = {
    ProfileURL: 'base/test/fixtures/Coverage-Profile-standalone.covjson',
    CollectionURL: 'base/test/fixtures/VerticalProfileCoverageCollection-standalone.covjson',
    GridCategoricalURL: 'base/test/fixtures/Coverage-Grid-categorical-standalone.covjson',
    Profile: () => ({
      "type" : "Coverage",
      "profile" : "VerticalProfileCoverage",
      "domain" : {
        "type" : "Domain",
        "profile" : "VerticalProfile",
        "axes": {
          "x": { "values": [-10.1] },
          "y": { "values": [-40.2] },
          "z": { "values": [ 5.4562, 8.9282 ] },
          "t": { "values": ["2013-01-13T11:12:20Z"] }
        }
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
        "type" : "RangeSet",
        "PSAL" : {
          "type" : "Range",
          "dataType": "float",
          "values" : [ 43.9599, 43.3599 ]
        }
      }
    }),
    Grid: () => ({
      "type" : "Coverage",
      "profile" : "GridCoverage",
      "domain" : {
        "type" : "Domain",
        "profile" : "Grid",
        "axes": {
          "x": { "values": [-10,-5,0] },
          "y": { "values": [40,50] }, 
          "z": { "values": [5] },
          "t": { "values": ["2010-01-01T00:12:20Z"] }
        },
        "rangeAxisOrder": ["t","z","y","x"]
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
        "type" : "RangeSet",
        "ICEC" : {
          "type" : "Range",
          "dataType": "float",
          "values" : [ 0.5, 0.6, 0.4, 0.6, 0.2, null ],
          "validMin" : 0,
          "validMax" : 1
        }
      }
    }),
    GridRegular: () => ({
      "type" : "Coverage",
      "profile" : "GridCoverage",
      "domain" : {
        "type" : "Domain",
        "profile" : "Grid",
        "axes": {
          "x": { "values": [-10,-5,0] },
          "y": { "start": 40, "stop": 50, "num": 2 },
          "z": { "values": [5] },
          "t": { "values": ["2010-01-01T00:12:20Z"] }
        },
        "rangeAxisOrder": ["t","z","y","x"]
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
        "type" : "RangeSet",
        "ICEC" : {
          "type" : "Range",
          "dataType": "float",
          "values" : [ 0.5, 0.6, 0.4, 0.6, 0.2, null ]
        }
      }
    }),
    CollectionEmpty: () => ({
      "type" : "CoverageCollection",
      "coverages": []
    })
}
