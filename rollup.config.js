import { defineConfig } from 'rollup';
import babel from '@rollup/plugin-babel'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'

const outputCfgs = [
  {
    minify: true,
  },
  {
    minify: false
  }
]

export default defineConfig({
  input: 'src/reader.js',
  plugins: [
    nodeResolve({ browser: true }),
    commonjs({ include: 'node_modules/**' }),
    babel({ babelHelpers: 'bundled' }),
  ],
  external: ['covutils'],

  output: outputCfgs.map(opts => ({
    file: 'covjson-reader.' + (opts.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    name: 'CovJSON',
    sourcemap: true,
    globals: {
      covutils: 'CovUtils'
    },
    plugins: (opts.minify ? [terser()] : [])
  })),
})
