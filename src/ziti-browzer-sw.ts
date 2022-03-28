declare const self: ServiceWorkerGlobalScope;

import {NetworkOnly} from 'workbox-strategies';
import {
  cleanupOutdatedCaches, 
  // precacheAndRoute
} from 'workbox-precaching';
import {ExpirationPlugin} from 'workbox-expiration';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {skipWaiting} from 'workbox-core';
import {URLPattern} from 'urlpattern-polyfill';
import {ZitiFirstStrategy} from '@openziti/ziti-browzer-sw-workbox-strategies';

import pjson from '../package.json';


// precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();


registerRoute(
  ({request}) => new URLPattern({
    pathname: '/(.*)',
  }).test(request.url),
  new ZitiFirstStrategy(
    {
      logLevel:       new URLSearchParams(location.search).get("logLevel")      || 'Silent',
      controllerApi:  new URLSearchParams(location.search).get("controllerApi") || undefined,
      cacheName:      'ziti-browzer-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
        }),
      ],
    }
  )
);


// If anything goes wrong when handling a route, return the network response.
setCatchHandler(new NetworkOnly());

skipWaiting();

self.addEventListener('message', (event) => {

  console.log(`message received: `, event);

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage(pjson.version);
  }
});
