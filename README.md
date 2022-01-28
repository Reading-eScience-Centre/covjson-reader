# covjson-reader

[![NPM version](http://img.shields.io/npm/v/covjson-reader.svg)](https://npmjs.org/package/covjson-reader) 

A library that reads [CoverageJSON](https://covjson.org) documents and exposes them as [Coverage data objects](https://github.com/reading-escience-centre/coverage-jsapi).

[API docs](https://doc.esdoc.org/github.com/Reading-eScience-Centre/covjson-reader/)

## Usage

A browser version of this library is hosted on both [jsDelivr](https://www.jsdelivr.com/package/npm/covjson-reader)
and [cdnjs](https://cdnjs.com/libraries/covjson-reader).

Usage is simple:
```html
<script src="https://cdn.jsdelivr.net/npm/covutils@0.6/covutils-lite.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/covjson-reader@0.16/covjson-reader.min.js"></script>
<script>
CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
  // work with Coverage object
}).catch(function (e) {
  // there was an error when loading the coverage
  console.log(e)
})
</script>
```

Note that this package has a dependency on the `covutils` package which must be loaded separately when using the browser bundle as shown above.

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
