// import {terser} from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import OMT from '@surma/rollup-plugin-off-main-thread';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
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

    /**
     * comment out the following IFF doing 'yarn link @openziti/ziti-browzer-sw-workbox-strategies' dev builds
     */
    // if (id.includes('/ziti-browzer-sw/node_modules/@openziti/ziti-browzer-core/')) {
    //   console.log('rollup-config: id is: ', id)
    //   return undefined;
    // }

    const chunkNames = [
      '/lodash-es/',
      '/workbox-routing/',
      '/libcrypto/',
      '/ziti-browzer-core/',
      '/ziti-browzer-sw-workbox-strategies/',
      '/ziti-browzer-edge-client/',
      'workbox-core',
      'workbox-expiration',
      'workbox-precaching',
      'workbox-strategies',
      'uuid',
    ];

    // console.log('id is: ', id);

    let res = chunkNames.find((chunkName) => id.includes(chunkName) ) || 'misc';
    // console.log('res is: ', res);
    let regex = /\//g;
    res = res.replace(regex,'-');
    return `ziti-browzer-sw-${res}`;

  },
  plugins: [
    commonjs(),
    json(),
    nodeResolve({
      preferBuiltins: false
    }),
    resolve({
      preferBuiltins: false,
      browser: true,
    }),
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
