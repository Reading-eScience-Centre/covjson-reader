var fs = require('fs')

module.exports = function(config) {
  
  // Use ENV vars on Travis and sauce.json locally to get credentials
  if (!process.env.SAUCE_USERNAME) {
    if (!fs.existsSync('sauce.json')) {
      console.log('Create a sauce.json with your credentials based on the sauce-sample.json file.');
      process.exit(1);
    } else {
      process.env.SAUCE_USERNAME = require('./sauce').username;
      process.env.SAUCE_ACCESS_KEY = require('./sauce').accessKey;
    }
  }

  // Browsers to run on Sauce Labs
  var customLaunchers = {
    'SL_Chrome': {
      base: 'SauceLabs',
      browserName: 'chrome'
    },
    'SL_Firefox': {
      base: 'SauceLabs',
      browserName: 'firefox'
    },
    'SL_Edge': {
      base: 'SauceLabs',
      browserName: 'MicrosoftEdge'
    }
    /* // we skip Safari testing for now as that triggers some weird bug
     * // see https://travis-ci.org/Reading-eScience-Centre/covjson-reader/builds/141844696
    'SL_Safari': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.11'
    }*/
  };
  
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'mocha'],

    // list of files / patterns to load and/or serve in the browser
    files: [
      {pattern: 'test/fixtures/**/*.covjson', included: false, served: true},
      'test/**/*.js'
    ],
    
    proxies: {
      '/fixtures/': 'http://localhost:9876/base/test/fixtures/'
    },


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/**/*.js': ['browserify']
    },
    
    browserify: {
      transform: [
        ['babelify', { "presets": ["es2015"], "plugins": ["istanbul"] }]
      ]
    },

    coverageReporter: {
      reporters: [
        {'type': 'text'},
        {'type': 'lcovonly',
         'subdir': function (browser) {
           // normalize
           return browser.toLowerCase().split(/[ /-]/)[0]
         }}
      ]
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots', 'saucelabs', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    sauceLabs: {
      testName: 'covjson-reader',
      recordScreenshots: false
    },
    captureTimeout: 120000,
    browserNoActivityTimeout: 120000,
    customLaunchers: customLaunchers,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: Object.keys(customLaunchers),
    singleRun: true
  })
}
