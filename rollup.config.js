// import {terser} from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import OMT from '@surma/rollup-plugin-off-main-thread';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
// import workboxInjectManifest from 'rollup-plugin-workbox-inject';
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from '@rollup/plugin-json';

const SRC_DIR   = 'src';
const BUILD_DIR = 'dist';

export default {
  input: `${SRC_DIR}/ziti-browzer-sw.ts`,
  manualChunks: (id) => {

    if (!id.includes('/node_modules/')) {
      return undefined;
    }

    const chunkNames = [
      '@openziti/libcrypto',
      '@openziti/ziti-browzer-sw-workbox-strategies',
      '@openziti/ziti-browzer-edge-client',
      'workbox-core',
      'workbox-expiration',
      'workbox-precaching',
      'workbox-routing',
      'workbox-strategies',
    ];

    let res = chunkNames.find((chunkName) => id.includes(chunkName) ) || 'misc';
    res = res.replace('/','-');
    return `ziti-browzer-sw-${res}`;

  },
  plugins: [
    json(),
    nodeResolve({
      preferBuiltins: false
    }),
    resolve({
      browser: true,
    }),
    commonjs(),
    replace({
      'preventAssignment': true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    }),
    typescript(),
    OMT(),
    // workboxInjectManifest({
    //   globDirectory: BUILD_DIR,
    //   globPatterns: [
    //     '*.js',
    //   ],
    //   "globIgnores": [
    //     "**/node_modules/**/*",
    //     "*.map",
    //   ]
    // }),
    // terser(),
  ],
  output: {
    sourcemap: false,
    format: 'amd',
    dir: BUILD_DIR,
  },
};
