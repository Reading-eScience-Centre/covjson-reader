# Development guide

## Getting started

First, install [Node.js](https://nodejs.org/download/).

Now, clone this repository and run the following in a shell in the checked out folder:
```
$ npm install
```

This installs all (development) dependencies in local subfolders.
It can be run at any time should the versions in the package.json change.

## Running tests

Simply run:
```
$ npm test
```

This tests the library with Chrome which will get started in the background.

Tests can be automatically re-run on file changes. For that, instead start the long-running test runner:
```
$ npm run karma
```
Test output will appear in the shell.

## Building a browser bundle

A stand-alone browser bundle that exposes the global `CovJSON` object can be created with:
```
$ npm run build
```
This will build the covjson-reader.{src|min}.js files in the root project folder.

Note that both the [ndarray](https://www.npmjs.com/package/ndarray) and 
[url-template](https://www.npmjs.com/package/url-template) dependencies are included in the bundle.
The [covutils](https://www.npmjs.com/package/covutils) dependency has to be imported manually
as it is a dependency typically used by more than one library, for example,
[leaflet-coverage](https://www.npmjs.com/package/leaflet-coverage) also uses it.

## Publishing a new version

1. Raise the version number in package.json.
2. If it is a minor or major version change, update the version in [README.md](README.md).
3. Create a [semver](http://semver.org/) [git tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging) (`x.y.z`) and push it.
4. Regenerate documentation at https://doc.esdoc.org.
5. Run `npm publish`.
6. Attach the `covjson-reader.{src|min}.js[.map]` files to the GitHub release.

The last two steps build and publish the package to the [npm registry](https://www.npmjs.com/package/covjson-reader).

## Code style

The [JavaScript Standard Style](http://standardjs.com) is used in this project.
Conformance can be checked with:
```
$ npm run style
```

