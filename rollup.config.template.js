import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import uglify from 'rollup-plugin-uglify'

export default options => {
  return {
    entry: 'src/reader.js',
    plugins: [
      babel({
        exclude: 'node_modules/**',
        presets: [ [ "es2015", { modules: false } ] ],
        plugins: ["external-helpers"]
      }),
      nodeResolve({ jsnext: true, browser: true }),
      commonjs({ include: 'node_modules/**' })
    ].concat(options.minify ? [uglify()] : []),
    external: ['covutils'],

    dest: 'covjson-reader.' + (options.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    moduleName: 'CovJSON',
    globals: {
      covutils: 'CovUtils'
    },
    sourceMap: true
  }
}