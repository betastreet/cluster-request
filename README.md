# cluster-request

`npm i --save cluster-request`

```
const ClusterRequest = require('cluster-request');

const cluster = new ClusterRequest({
    log, // a Bunyan logger instance
    defaultPort: 80,
    defaultReqOptions: {
        headers: {
            'x-user-roles': 'admin',
        },
        json: true,
        gzip: true,
    },
});

// module.exports = cluster;

cluster.request(host, path, reqOptions, headers)
    .then({ body, statusCode } => ... body.data ...)
    .catch(err => ...);

cluster.validateResponse({ statusCode, body })
    .then(data => ...)
    .catch(err => ...);

```
