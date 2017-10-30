import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'build/bundle.js',
    format: 'cjs'
  },
  external: [
    // built ins
    'assert',
    'events',
    'fs',
    'path',
    'util'
  ],
  plugins: [
    resolve(),
    commonjs()
  ]
};