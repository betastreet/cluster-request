module.exports = (reqOptions, next) => {
    if (!next) {
        throw new Error('Callback expected');
    }
    if (reqOptions.url === 'http://geos-api:80/') {
        next(null, { statusCode: 200 }, JSON.stringify({data: [{geo_id: '100'}]}));
    } else if (reqOptions.url === 'http://verticals-api:80/') {
        const body = {
            "code": "NotFoundError",
            "message": "ADVERTISER_NOT_FOUND"
        };
        const statusCode = 404;
        setImmediate(() => {
            next(null, {statusCode}, JSON.stringify(body));
        });
    } else if (reqOptions.url === 'http://badjson:443/') {
        const statusCode = 203;
        setImmediate(() => {
            next(null, {statusCode}, "bad json");
        });
    }
};
