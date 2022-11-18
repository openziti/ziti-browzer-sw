interface zitiBrowzerServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  _sendMessageToClients: (message: any) => Promise<unknown>;
  _unregister: () => Promise<unknown>;
  _pingPage: () => Promise<unknown>;
  _logLevel: any;
  _logger: any;
  _core: ZitiBrowzerCore;
  _zitiContext: any;
  _zitiConfig: any;
  _uuid: any;
  _cookieObject: any;
  _zbrReloadPending: boolean;
  _zbrPingTimestamp: any;
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
 
let zfs = new ZitiFirstStrategy(
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
);


const matchGETCb = (url:any, request:any) => {
  if (typeof self._zitiConfig === 'undefined') {
    return true;
  }
  let controllerURL = new URL(self._zitiConfig.controller.api);
  if (url.hostname === controllerURL.hostname) {
    return false;
  } else {
    return true;
  }
};

registerRoute(
  ({url, request}) => matchGETCb(url, request), zfs, 'GET'
);

const matchPOSTCb = (url:any, request:any) => {
  if (url.hostname === self._zitiConfig.httpAgent.self.host) {
    return true;
  } else {
    return false;
  }
};

registerRoute(
  ({url, request}) => matchPOSTCb(url, request), zfs, 'POST'
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
    self._logger.trace(`message.ZBR_INIT_COMPLETE received, payload is: `, event.data.payload);
    self._zbrReloadPending = false;
    self._zitiConfig = event.data.payload.zitiConfig;
    self._zbrPingTimestamp = Date.now();
  }


  /**
   * 
   */
  else if (event.data.type === 'ZBR_PING') {
    self._zbrPingTimestamp = event.data.payload.timestamp;
  }
  
  /**
   * 
   */
  else if (event.data.type === 'UNREGISTER') {
    self._logger.trace(`message.UNREGISTER received `);
    self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' })
    for (const window of windows) {
      window.postMessage(
        { 
          type: 'RELOAD'
        } 
      )
    }
  }

  /**
   * 
   */
  else {
    self._logger.error(`message.<UNKNOWN> received [${event.data.type}]`);
  }
});

/**
 * 
 */
self._unregister = async function (  ) {
  self._logger.trace(`_unregister starting `);
  self.registration.unregister();
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'RELOAD'
      } 
    )
  }
  self._logger.trace(`_unregister completed `);
}


/**
 * 
 */
self._pingPage = async function (  ) {
  self._logger.trace(`_pingPage starting `);
  self.registration.unregister();
  const windows = await self.clients.matchAll({ type: 'window' })

  return new Promise( async function(resolve, reject) {

    for (const window of windows) {

      var messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = function( event ) {
        self._logger.trace('_pingPage() <-- reply received');
        resolve('ok');
      };

      window.postMessage(
        { 
          type: 'PING',
        },
        [messageChannel.port2]
      )
    }
    self._logger.trace(`_pingPage() --> sent `);  
  });
}


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
