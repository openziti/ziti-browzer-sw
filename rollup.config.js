// import {terser} from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import OMT from '@surma/rollup-plugin-off-main-thread';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import workboxInjectManifest from 'rollup-plugin-workbox-inject';

const SRC_DIR   = 'src';
const BUILD_DIR = 'dist';

export default {
  input: `${SRC_DIR}/ziti-browzer-sw.ts`,
  manualChunks: (id) => {

    if (!id.includes('/node_modules/')) {
      return undefined;
    }

    const chunkNames = [
      'workbox-core',
      'workbox-expiration',
      'workbox-precaching',
      'workbox-routing',
      'workbox-strategies'
    ];

    let res = chunkNames.find((chunkName) => id.includes(chunkName) ) || 'misc';
    return `ziti-browzer-sw-${res}`;

  },
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    }),
    typescript(),
    OMT(),
    workboxInjectManifest({
      globDirectory: BUILD_DIR,
    }),
    // terser(),
  ],
  output: {
    sourcemap: true,
    format: 'amd',
    dir: BUILD_DIR,
  },
};
