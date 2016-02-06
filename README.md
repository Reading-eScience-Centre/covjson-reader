# covjson-reader [![Build Status](https://travis-ci.org/Reading-eScience-Centre/covjson-reader.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/covjson-reader)

A library that reads [CoverageJSON](https://github.com/neothemachine/coveragejson) documents and exposes them as [Coverage objects](https://github.com/neothemachine/coverage-jsapi).

[API docs](https://doc.esdoc.org/github.com/reading-escience-centre/covjson-reader/)

## Usage

covjson-reader can be used both on node.js and browsers.

A minified browser version of this library is [hosted on the jsDelivr CDN](http://www.jsdelivr.com/projects/covjson-reader).

Usage is simple:
```html
<script src="https://cdn.jsdelivr.net/covjson-reader/0.6/covjson-reader.min.js"></script>
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
System.import('npm:covjson-reader@^0.6', function (CovJSON) {

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
