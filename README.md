[![Version](https://badge.fury.io/js/cluster-request.svg)](http://badge.fury.io/js/cluster-request)
[![Build Status](https://travis-ci.org/betastreet/cluster-request.svg?branch=master)](https://travis-ci.org/betastreet/cluster-request)
 
# cluster-request

A proxy module to send requests within a Kubernetes cluster of microservices

### Installation

`npm i --save cluster-request`

### Default Request Options

```
method: 'GET',
json: true,
gzip: true
```

### Usage

```javascript
const ClusterRequest = require('./lib');
const log = console;

const cluster = new ClusterRequest({
    log,
    defaultPort: 80,
    defaultReqOptions: {
        headers: {},
        json: true,
        gzip: false,
    },
});

cluster
    .request('echo.jsontest.com', '/a/b/c/d/e/1/data/some_data', {})
    .then((response) => {
        console.log('Status Code: ', response.statusCode);
        console.log('Body: ', response.body);

        cluster
            .validateResponse(response)
            .then((data) => {
                console.log('Response data: ', data);
            })
            .catch((err) => {
                console.log('Error: ', err);
            });
    })
    .catch((err) => {
        console.log('Error: ', err);
    });
```

Source: [demo.js](demo.js)
