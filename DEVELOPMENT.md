# Development guide

## Getting started

First, install [Node.js](https://nodejs.org/download/).

Then, install JSPM globally:
```
$ npm install jspm/jspm-cli -g
```

Now, clone this repository and run the following in a shell in the checked out folder:
```
$ npm install
$ jspm install
```

This installs all (development) dependencies in local subfolders.
It can be run at any time should the versions in the package.json change.

## Running tests

Simply run:
```
$ npm test
```

This tests the library with Firefox and Chrome which will get started for that purpose.

Tests can be automatically re-run on file changes. For that, instead start the long-running
test runner:
```
$ npm run karma
```
and minimize the browser windows that popped up. Test output will appear in the shell.

## Building a classic bundle

A stand-alone bundle that exposes the global `CovJSON` object can be created with:
```
$ npm run build
```
This will build the covjson-reader.{src|min}.js files in the root project folder.

Note that for convenienc both the cbor-js and ndarray dependencies are included in the bundle since
they are not hosted on a CDN yet. 

## Publishing a new version

Raise the version number, create a semver git tag (`x.y.z`), and run:
```
$ npm publish
```

This builds and publishes the classic bundle to the npm registry.
This project is registered on http://www.jsdelivr.com such that on every new
npm release, the bundle is made available automatically on the jsDelivr CDN.

Note that the git tag alone is enough to make a new version usable via the JSPM CDN.
The publishing step on npm (and therefore jsDelivr) is there to support classic clients
which can't / don't want to use ECMAScript modules yet.

## Code style

The [JavaScript Standard Style](http://standardjs.com) is used in this project.
Conformance can be checked with:
```
$ npm run style
```

