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
