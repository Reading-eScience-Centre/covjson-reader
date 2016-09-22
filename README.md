# covjson-reader [![Build Status](https://travis-ci.org/Reading-eScience-Centre/covjson-reader.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/covjson-reader)

A library that reads [CoverageJSON](https://covjson.org) documents and exposes them as [Coverage data objects](https://github.com/reading-escience-centre/coverage-jsapi).

[API docs](https://doc.esdoc.org/github.com/Reading-eScience-Centre/covjson-reader/)

## Usage

A browser version of this library is hosted on both [jsDelivr](http://www.jsdelivr.com/projects/covjson-reader) and [cdnjs](https://cdnjs.com/libraries/covjson-reader), where the latter also hosts the unminified version together with source maps.

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

Depending on which browsers shall be supported it may be necessary to include polyfills before loading this library. For example, IE11 requires [polyfills](https://github.com/zloirock/core-js) for `Promise`, `Symbol`, `Map`, and `Array`.

### browserify/JSPM

This library can be used with [browserify](http://browserify.org) and similar tools like [JSPM](http://jspm.io) by importing it via npm.

JSPM example:
```html
<script src="https://jspm.io/system.js"></script>
<script>
System.import('npm:covjson-reader', function (CovJSON) {

  CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
    // work with Coverage object
  }).catch(function (e) {
    // there was an error when loading the coverage
    console.log(e)
  })

})
</script>
```

## Acknowledgments

This library is developed within the [MELODIES project](http://www.melodiesproject.eu).
