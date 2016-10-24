# covjson-reader

[![NPM version](http://img.shields.io/npm/v/covjson-reader.svg)](https://npmjs.org/package/covjson-reader) 
[![dependencies Status](https://david-dm.org/Reading-eScience-Centre/covjson-reader/status.svg)](https://david-dm.org/Reading-eScience-Centre/covjson-reader)
[![devDependencies Status](https://david-dm.org/Reading-eScience-Centre/covjson-reader/dev-status.svg)](https://david-dm.org/reading-escience-centre/covjson-reader?type=dev)
[![Build Status](https://travis-ci.org/Reading-eScience-Centre/covjson-reader.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/covjson-reader)
[![codecov](https://codecov.io/gh/Reading-eScience-Centre/covjson-reader/branch/master/graph/badge.svg)](https://codecov.io/gh/Reading-eScience-Centre/covjson-reader)
[![Inline docs](http://inch-ci.org/github/Reading-eScience-Centre/covjson-reader.svg?branch=master)](http://inch-ci.org/github/Reading-eScience-Centre/covjson-reader)

A library that reads [CoverageJSON](https://covjson.org) documents and exposes them as [Coverage data objects](https://github.com/reading-escience-centre/coverage-jsapi).

[API docs](https://doc.esdoc.org/github.com/Reading-eScience-Centre/covjson-reader/)

## Usage

A browser version of this library is hosted on both [jsDelivr](http://www.jsdelivr.com/projects/covjson-reader)
and [cdnjs](https://cdnjs.com/libraries/covjson-reader), where the latter also hosts the unminified version together with source maps.

Usage is simple:
```html
<script src="https://unpkg.com/covutils/covutils-lite.min.js"></script>
<script src="https://cdn.jsdelivr.net/covjson-reader/0.16/covjson-reader.min.js"></script>
<script>
CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
  // work with Coverage object
}).catch(function (e) {
  // there was an error when loading the coverage
  console.log(e)
})
</script>
```

The library makes use of the following [ES2015](https://en.wikipedia.org/wiki/ECMAScript#6th_Edition_-_ECMAScript_2015) features:
`Promise`, `Symbol`, `Map`, and `Array.from`.
Depending on which browsers you need to support it may be necessary to include 
[polyfills](https://github.com/zloirock/core-js) before loading this library. 

### NPM

This library can be used with [browserify](http://browserify.org) and similar tools by importing it via npm.

ES2015 syntax:
```js
import * as CovJSON from 'covjson-reader'

CovJSON.read('http://example.com/coverage.covjson').then(cov => {
  // work with Coverage object
}).catch(e => {
  // there was an error when loading the coverage
  console.log(e)
})
```

## Acknowledgments

This library has been developed within the [MELODIES project](http://www.melodiesproject.eu) and is maintained as open source software.
