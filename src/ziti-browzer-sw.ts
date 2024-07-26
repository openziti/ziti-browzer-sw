interface zitiBrowzerServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  _sendMessageToClients: (message: any) => Promise<unknown>;
  _unregister: () => Promise<unknown>;
  _unregisterNoReload: () => void;
  _accessTokenExpired: () => Promise<unknown>;
  _pingPage: () => Promise<unknown>;
  _noConfigForService: (serviceName: any) => Promise<unknown>;
  _noConfigProtocolForService: (serviceName: any) => Promise<unknown>;
  _sessionCreationError: (error: any) => Promise<unknown>;
  _wssERConnectionError: (error: any) => Promise<unknown>;
  _noService: (error: any) => Promise<unknown>;
  _invalidAuth: (error: any) => Promise<unknown>;
  _channelConnectFail: (error: any) => Promise<unknown>;
  _requestFailedWithNoResponse: (error: any) => Promise<unknown>;
  _noWSSRouters: (error: any) => Promise<unknown>;
  _xgressEvent: (event: any) => Promise<unknown>;
  _nestedTLSHandshakeTimeout: (event: any) => Promise<unknown>;
  _sendLogMessage: (event: any) => Promise<unknown>;
  _logLevel: any;
  _logger: any;
  _core: ZitiBrowzerCore;
  _zitiContext: any;
  _zitiConfig: any;
  _uuid: any;
  _cookieObject: any;
  _zbrReloadPending: boolean;
  _zbrPingTimestamp: any;
  _eruda: boolean;
}

declare const self: zitiBrowzerServiceWorkerGlobalScope;

import {cleanupOutdatedCaches} from 'workbox-precaching';
import {ExpirationPlugin} from 'workbox-expiration';
import {registerRoute, setCatchHandler} from 'workbox-routing';
import {clientsClaim} from 'workbox-core';
import {ZitiFirstStrategy} from '@openziti/ziti-browzer-sw-workbox-strategies';
import { ZitiBrowzerCore } from '@openziti/ziti-browzer-core';
import { v4 as uuidv4 } from 'uuid';

import pjson from '../package.json';


/**
 * 
 */
self._uuid = uuidv4();
self._core = new ZitiBrowzerCore({});
let erudaSpecification = new URLSearchParams(location.search).get("eruda");
self._eruda = false;
if (erudaSpecification && (erudaSpecification === 'true')) { 
  self._eruda = true;
}

self._logger = self._core.createZitiLogger({
  logLevel: new URLSearchParams(location.search).get("logLevel") || 'Silent',
  suffix: 'ZBSW',
  useSWPostMessage: self._eruda,
  zitiBrowzerServiceWorkerGlobalScope: self,
});
self._cookieObject = {};
self._logger.trace(`main sw starting for UUID: `, self._uuid);
 
let zfs = new ZitiFirstStrategy(
  {
    uuid: self._uuid,
    zitiBrowzerServiceWorkerGlobalScope: self,
    logLevel:       new URLSearchParams(location.search).get("logLevel")      || 'Silent',
    controllerApi:  new URLSearchParams(location.search).get("controllerApi") || undefined,
    eruda: self._eruda,

    cacheName:      'ziti-browzer-cache',

    plugins: [
      new ExpirationPlugin({

        // Cap the number of items we cache
        maxEntries: 1000,
        
        // Don't keep any items for more than 7 days
        maxAgeSeconds: 7 * 24 * 60 * 60,

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
  let getURL = new URL(url);
  if (getURL.pathname.includes(".well-known/openid-configuration")) {
    return false;
  }
  if (getURL.pathname.includes("ziti-browzer-latest-release-version")) {
    return false;
  }
  if (getURL.pathname.includes("browzer_error")) {
    return false;
  }
  if (typeof self._zitiConfig === 'undefined') {
    return true;
  }

  if (getURL.searchParams.get("code") && getURL.searchParams.get("state") &&
      getURL.pathname !== self._zitiConfig.idp.nested_sso_inner_cb_path) {
    return false;
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

registerRoute(
  ({url, request}) => matchGETCb(url, request), zfs, 'HEAD'
);

const matchPOSTCb = (url:any, request:any) => {
  if (typeof self._zitiConfig === 'undefined') {
    return false;
  }
  if (url.hostname === self._zitiConfig.browzer.bootstrapper.self.host) {
    return true;
  } else {
    return false;
  }
};

registerRoute(
  ({url, request}) => matchPOSTCb(url, request), zfs, 'POST'
);

const matchPUTCb = (url:any, request:any) => {
  if (typeof self._zitiConfig === 'undefined') {
    return false;
  }
  if (url.hostname === self._zitiConfig.browzer.bootstrapper.self.host) {
    return true;
  } else {
    return false;
  }
};

registerRoute(
  ({url, request}) => matchPUTCb(url, request), zfs, 'PUT'
);

const matchPATCHCb = (url:any, request:any) => {
  if (typeof self._zitiConfig === 'undefined') {
    return false;
  }
  if (url.hostname === self._zitiConfig.browzer.bootstrapper.self.host) {
    return true;
  } else {
    return false;
  }
};

registerRoute(
  ({url, request}) => matchPATCHCb(url, request), zfs, 'PATCH'
);

const matchDELETECb = (url:any, request:any) => {
  if (typeof self._zitiConfig === 'undefined') {
    return false;
  }
  if (url.hostname === self._zitiConfig.browzer.bootstrapper.self.host) {
    return true;
  } else {
    return false;
  }
};

registerRoute(
  ({url, request}) => matchDELETECb(url, request), zfs, 'DELETE'
);


clientsClaim();

self.addEventListener('install', (event) => {
  self._logger.trace(`'install' received`);
  self.skipWaiting();
});


/**
 * 
 */
self.addEventListener('message', async (event) => {

  /**
   * 
   */
  if (event.data.type === 'GET_VERSION') {
    self.skipWaiting();
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
    self.skipWaiting();
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
    // self._logger.trace(`message.SET_COOKIE received, payload is: `, event.data.payload);
    let name = event.data.payload.name;
    let value = event.data.payload.value;
    if (typeof self._cookieObject !== 'undefined') {
        self._cookieObject[name] = value;
        // self._logger.trace(`_cookieObject: `, self._cookieObject);
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
    self._logger.info(`message.<UNKNOWN> received [${event.data.type}]`);
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
self._unregisterNoReload = function (  ) {
  self._logger.trace(`_unregisterNoReload starting `);
  self.registration.unregister();
  self._logger.trace(`_unregisterNoReload completed `);
}

/**
 * 
 */
 self._accessTokenExpired = async function (  ) {
  self._logger.trace(`_accessTokenExpired starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'ACCESS_TOKEN_EXPIRED'
      } 
    )
  }
  self._logger.trace(`_accessTokenExpired completed `);
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
 self._noConfigForService = async function ( event: any ) {
  self._logger.trace(`_noConfigForService starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'NO_CONFIG_FOR_SERVICE',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_noConfigForService completed `);
}

/**
 * 
 */
 self._noConfigProtocolForService = async function ( event: any ) {
  self._logger.trace(`_noConfigProtocolForService starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'NO_CONFIG_PROTOCOL_FOR_SERVICE',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_noConfigProtocolForService completed `);
}

/**
 * 
 */
 self._wssERConnectionError = async function ( event: any ) {
  self._logger.trace(`_wssERConnectionError starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'WSS_ROUTER_CONNECTION_ERROR',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_wssERConnectionError completed `);
}

/**
 * 
 */
 self._sessionCreationError = async function ( event: any ) {
  self._logger.trace(`_sessionCreationError starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'SESSION_CREATION_ERROR',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_sessionCreationError completed `);
}

/**
 * 
 */
 self._noService = async function ( event: any ) {
  self._logger.trace(`_noService starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'NO_SERVICE',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_noService completed `);
}

/**
 * 
 */
 self._invalidAuth = async function ( event: any ) {
  self._logger.trace(`_invalidAuth starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'INVALID_AUTH',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_invalidAuth completed `);
}

/**
 * 
 */
self._channelConnectFail = async function ( event: any ) {
  self._logger.trace(`_channelConnectFail starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'CHANNEL_CONNECT_FAIL',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_channelConnectFail completed `);
}

/**
 * 
 */
 self._noWSSRouters = async function ( event: any ) {
  self._logger.trace(`_noWSSRouters starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'NO_WSS_ROUTERS',
        payload: {
          event
        }
      } 
    )
  }
  self._logger.trace(`_noWSSRouters completed `);
}

/**
 *
 */
self._requestFailedWithNoResponse = async function ( event: any ) {
  self._logger.trace(`_requestFailedWithNoResponse starting `);
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      {
        type: 'REQUEST_FAILED_WITH_NO_RESPONSE',
        payload: {
          event
        }
      }
    )
  }
  self._logger.trace(`_invalidAuth completed `);
}

/**
 * 
 */
self._xgressEvent = async function ( event: any ) {
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      { 
        type: 'XGRESS_EVENT',
        payload: {
          event
        }
      } 
    )
  }
}

/**
 * 
 */
 self._nestedTLSHandshakeTimeout = async function ( event: any ) {
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      {
        type: 'NESTED_TLS_HANDSHAKE_TIMEOUT_EVENT',
        payload: {
          event
        }
      }
    )
  }
}

/**
 * 
 */
self._sendLogMessage = async function ( event: any ) {
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const window of windows) {
    window.postMessage(
      {
        type: 'LOG_MESSAGE_EVENT',
        payload: {
          event
        }
      }
    )
  }
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
