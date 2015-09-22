# covjson-reader [![Build Status](https://travis-ci.org/Reading-eScience-Centre/covjson-reader.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/covjson-reader)

A library that reads [CoverageJSON](https://github.com/neothemachine/coveragejson) documents and exposes them as [Coverage objects](https://github.com/neothemachine/coverage-jsapi).

[API docs](https://doc.esdoc.org/github.com/reading-escience-centre/covjson-reader/)

## Usage

A minified version of this library is [hosted on the jsDelivr CDN](http://www.jsdelivr.com/projects/covjson-reader).

Usage is simple:
```html
<script src="https://cdn.jsdelivr.net/covjson-reader/0.1/covjson-reader.min.js"></script>
<script>
CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
  // work with Coverage object
}).catch(function (e) {
  // there was an error when loading the coverage
  console.log(e)
})
</script>
```

### ECMAScript module

This library is written as an [ECMAScript module](http://exploringjs.com/es6/ch_modules.html)
and uses the [JSPM](http://jspm.io) loader [SystemJS](https://github.com/systemjs/systemjs).

Here is how to import the module with SystemJS:
```html
<script src="https://jspm.io/system.js"></script>
<script>
System.import('github:reading-escience-centre/covjson-reader@0.1', function (CovJSON) {

  CovJSON.read('http://example.com/coverage.covjson').then(function (cov) {
    // work with Coverage object
  }).catch(function (e) {
    // there was an error when loading the coverage
    console.log(e)
  })

})
</script>
```

Note that the version hosted on jsDelivr was transpiled from ES6 to ES5 and exposes the module as a
global object. This is for supporting classic usage and is different from directly using the
ECMAScript module like above.

## Acknowledgments

This library is developed within the [MELODIES project](http://www.melodiesproject.eu).
