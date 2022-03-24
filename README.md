<p align="center" width="100%">
<a href="https://ziti.dev"><img src="ziti.png" width="100"></a>
</p>

<p align="center">
    <b>
    <a>@openziti/ziti-browzer-sw</a>
    <br>
    <br>
    <b>
    This component contains the ServiceWorker used as part of the <a href="https://ziti.devdev/about">OpenZiti</a> Zero Trust browZer stack</b>
</p>

<p align="center">
    <br>
    <b>Are you interested in knowing how to easily embed programmable, high performance, zero trust networking into your app, on any internet connection, without VPNs?
    <br>
    Learn more about our <a href="https://ziti.devdev/about">OpenZiti</a> project by clicking the image below:</b>
    <br>
    <br>
    <a href="https://ziti.dev"><img src="ziti-dev-logo.png" width="200"></a>
</p>

---
[![Build](https://github.com/openziti/ziti-browzer-sw/workflows/Build/badge.svg?branch=main)]()
[![CodeQL](https://github.com/openziti/ziti-browzer-sw/workflows/CodeQL/badge.svg?branch=main)]()
[![Issues](https://img.shields.io/github/issues-raw/openziti/ziti-browzer-sw)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![LOC](https://img.shields.io/tokei/lines/github/openziti/ziti-browzer-sw)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=rounded)](CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

---

<!-- TOC -->

- [Overview](#overview)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)

<!-- /TOC -->


## Overview 

coming soon...

## Installation

The `ziti-browzer-sw` is intended to be consumed by the [`ziti-http-agent`](https://github.com/openziti/ziti-http-agent), not as a general purpose module in your build. It is available through [npm](https://www.npmjs.com/package/@openziti/ziti-browzer-sw), and installed via the following command:

    npm i @openziti/ziti-browzer-sw

The the [`ziti-http-agent`](https://github.com/openziti/ziti-http-agent) serves the contents of `ziti-browzer-sw` in response to HTTP requests originating from the 
[`ziti-browzer-runtime`](https://github.com/openziti/ziti-browzer-runtime). It does so by using the code shown below:
 
```js     

// Locate the path to the ServiceWorker distro within the build of our running instance
let pathToZitiBrowzerSwModule = require.resolve('@openziti/ziti-browzer-sw');

pathToZitiBrowzerSwModule = pathToZitiBrowzerSwModule.substring(0, pathToZitiBrowzerSwModule.lastIndexOf('/'));

// Read the component off the disk
fs.readFile( path.join( pathToZitiBrowzerSwModule, outgoing.path.split("/").pop() ), (err, data) => {

if (err) {  // If we can't read the file from disk

    res.writeHead(500, { 'x-ziti-http-agent-err': err.message });
    res.end('');
    return;

} else {    // Emit the Service Worker onto the wire

    res.writeHead(200, { 
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
        'x-ziti-http-agent-info': 'self-configured ziti service worker' 
    });

    res.write(data);  // the actual service worker code

    res.end('\n');
    return;
}

```


## Contributing

[![AllContibs](https://img.shields.io/github/contributors/openziti/ziti-browzer-sw)]()


Your Contributions are welcome! Please see our [Contributing Guide](Contributing.md) for more details. Thanks to all our contributors!

[![Contibs](https://contrib.rocks/image?repo=openziti/ziti-browzer-sw)]()



## License

Apache 2.0
