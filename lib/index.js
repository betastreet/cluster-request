const request = require('request');
const _ = require('lodash');

/* eslint-disable class-methods-use-this */

/**
 * Node Request response object
 * @typedef {http.IncomingMessage|{
 *  body: Object,
 *  statusCode: Number,
 *  headers: Object
 * }} Response
 */

class ClusterRequest {

    /**
     * @param {{
     *  [log]: Console|*,
     *  [defaultPort]: Number,
     *  [defaultReqOptions]: Object,
     * }} options
     */
    constructor(options = {}) {
        this.log = options.log;
        this.defaultPort = options.defaultPort || 80;
        this.defaultReqOptions = _.merge({}, {
            method: 'GET',
            json: true,
            gzip: true,
        }, options.defaultReqOptions || {});
    }

    /**
     * Execute a request to a service within the cluster
     * @param {String} host A string like "my-api" or "my-api:3000"
     * @param {String} path A string like "/users/5"
     * @param {Object} options Node Request options
     * @param {Object} headers Additional headers
     * @return {Promise.<Response>}
     */
    request(host, path, options = {}, headers = {}) {
        let portString = `:${this.defaultPort}`;
        if (/:\d+/.test(`${host}`)) {
            portString = '';
        }
        let reqPath = path;
        if (`${path}`.indexOf('/') !== 0) {
            reqPath = `/${reqPath}`;
        }
        const reqOptions = _.merge({}, { url: `http://${host}${portString}${reqPath}`, headers }, options);

        if (this.log) {
            this.log.trace(reqOptions);
        }

        return new Promise((resolve, reject) => {
            request(
                reqOptions,
                (error, response, body) => {
                    if (this.log) {
                        this.log.trace(error, response ? response.statusCode : null, body);
                    }
                    if (error) {
                        return reject(error);
                    }

                    const res = typeof body === 'string' ? JSON.parse(body) : body;
                    if (!res) {
                        return reject(new Error('Can not decode response body'));
                    }
                    return resolve({
                        statusCode: response.statusCode,
                        body: res,
                    });
                }
            );
        });
    }

    /**
     * Validate response
     * @param {Response} response
     * @return {boolean}
     */
    responseIsValid(response) {
        return response && response.statusCode >= 200 && response.statusCode <= 299;
    }

    /**
     * Validate response body
     * @param {Response} response
     * @return {Promise.<*>}
     */
    validateResponseBody(response) {
        if (this.responseIsValid(response)) {
            return Promise.resolve(response.body);
        }
        const safeResponse = Object.assign({}, { body: { message: 'Invalid response' }, statusCode: 500 }, response);
        const error = new Error(`${safeResponse.body.message} (${safeResponse.statusCode})`);
        error.statusCode = safeResponse.statusCode;

        return Promise.reject(error);
    }

    /**
     * Validate response
     * @param {Response} response
     * @return {Promise.<Object>}
     */
    validateResponse(response) {
        return this.validateResponseBody(response).then(r => r.data);
    }
}

/* eslint-enable class-methods-use-this */

module.exports = ClusterRequest;
