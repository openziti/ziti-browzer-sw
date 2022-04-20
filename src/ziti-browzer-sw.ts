interface zitiBrowzerServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  _logLevel: any;
  _logger: any;
  _core: ZitiBrowzerCore;
  _zitiConfig: any;
  _uuid: any;
}

declare const self: zitiBrowzerServiceWorkerGlobalScope;

import {NetworkOnly} from 'workbox-strategies';
import {
  cleanupOutdatedCaches, 
  // precacheAndRoute
} from 'workbox-precaching';
import {ExpirationPlugin} from 'workbox-expiration';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {NetworkFirst} from 'workbox-strategies';
import {clientsClaim} from 'workbox-core';
import {URLPattern} from 'urlpattern-polyfill';
import {ZitiFirstStrategy} from '@openziti/ziti-browzer-sw-workbox-strategies';
import { ZitiBrowzerCore } from '@openziti/ziti-browzer-core';
import { v4 as uuidv4 } from 'uuid';

import pjson from '../package.json';


/**
 * 
 */
 self._uuid = uuidv4();
 self._core = new ZitiBrowzerCore({});
 self._logger = self._core.createZitiLogger({
    logLevel: self._logLevel,
    suffix: 'SW'
 });
 self._logger.trace(`main sw starting for UUID: `, self._uuid);

 
// precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self._logger.trace(`cleanupOutdatedCaches complete`);


registerRoute(
  ({request}) => new URLPattern({
    pathname: '/(.*)',
  }).test(request.url),
  new ZitiFirstStrategy(
    {
      uuid: self._uuid,
      zitiBrowzerServiceWorkerGlobalScope: self,
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


// // If anything goes wrong when handling a route, return the network response.
// setCatchHandler(new NetworkOnly());

clientsClaim();

/**
 * 
 */
self.addEventListener('message', async (event) => {

  /**
   * 
   */
  if (event.data.type === 'GET_VERSION') {
    self._logger.trace(`message.GET_VERSION received`);
    event.ports[0].postMessage({
      version: pjson.version,
      zitiConfig: self._zitiConfig
    });
  }
  /**
   * 
   */
  else if (event.data.type === 'SET_CONFIG') {
    self._logger.trace(`message.SET_CONFIG received, payload is: `, event.data.payload);
    self._zitiConfig = event.data.payload.zitiConfig;
    self._logger.trace(`message.SET_CONFIG set for UUID: `, self._uuid);
    event.ports[0].postMessage({
      version: pjson.version,
      zitiConfig: self._zitiConfig
    });
  }

});
