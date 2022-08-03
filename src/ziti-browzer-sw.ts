interface zitiBrowzerServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  _sendMessageToClients: (message: any) => Promise<unknown>;
  _logLevel: any;
  _logger: any;
  _core: ZitiBrowzerCore;
  _zitiContext: any;
  _zitiConfig: any;
  _uuid: any;
  _cookieObject: any;
  _zbrReloadPending: boolean;
}

declare const self: zitiBrowzerServiceWorkerGlobalScope;

import {cleanupOutdatedCaches} from 'workbox-precaching';
import {ExpirationPlugin} from 'workbox-expiration';
import {registerRoute, setCatchHandler} from 'workbox-routing';
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
self._cookieObject = {};
self._logger.trace(`main sw starting for UUID: `, self._uuid);
 

registerRoute(

  ({request}) => new URLPattern( { pathname: '/(.*)', } ).test(request.url),

  new ZitiFirstStrategy(
    {
      uuid: self._uuid,
      zitiBrowzerServiceWorkerGlobalScope: self,
      logLevel:       new URLSearchParams(location.search).get("logLevel")      || 'Silent',
      controllerApi:  new URLSearchParams(location.search).get("controllerApi") || undefined,

      cacheName:      'ziti-browzer-cache',

      plugins: [
        new ExpirationPlugin({

          // Cap the number of items we cache
          maxEntries: 1000,
          
          // Don't keep any items for more than 30 days
          maxAgeSeconds: 30 * 24 * 60 * 60,

          // Automatically cleanup if cache quota is exceeded
          purgeOnQuotaError: false

        }),
        {
          fetchDidFail: async ({originalRequest, request, error, event, state}) => {
            // No return expected.
            // Note: `originalRequest` is the browser's request, `request` is the
            // request after being passed through plugins with
            // `requestWillFetch` callbacks, and `error` is the exception that caused
            // the underlying `fetch()` to fail.
          },        
        },
      ],
    }
  )
);


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

  /**
   * 
   */
  else if (event.data.type === 'SET_COOKIE') {
    self._logger.trace(`message.SET_COOKIE received, payload is: `, event.data.payload);
    let name = event.data.payload.name;
    let value = event.data.payload.value;
    if (typeof self._cookieObject !== 'undefined') {
        self._cookieObject[name] = value;
        self._logger.trace(`_cookieObject: `, self._cookieObject);
    }
  }

  /**
   * 
   */
  else if (event.data.type === 'ZBR_INIT_COMPLETE') {
    self._logger.trace(`message.ZBR_INIT_COMPLETE received `);
    self._zbrReloadPending = false;
  }

});


/**
 * 
 */
 self._sendMessageToClients = async function ( message ) {

  const allClients = await self.clients.matchAll({type: 'window'});

  return new Promise( async function(resolve, reject) {

    for (const client of allClients) {

      self._logger.trace('sendMessageToClients() processing cmd: ', message.type);

      var messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = function( event ) {
        self._logger.trace('ziti-sw: sendMessageToClient() reply event is: ', message.type, ' - ', event.data.response);
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data.response);
          }
      };

      client.postMessage(message, [messageChannel.port2]);
    } 
  });

}
