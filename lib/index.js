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

/**
 * Custom response object
 * @typedef {{
 *  body: {[data]: Array|Object},
 *  statusCode: Number,
 *  response: Response
 * }} CustomResponse
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

    request(host, path, options = {}, headers = {}) {
        let portString = `:${this.defaultPort}`;
        if (/:\d+/.test(`${host}`)) {
            portString = '';
        }
        let reqPath = path;
        if (`${path}`.indexOf('/') !== 0) {
            reqPath = `/${reqPath}`;
        }
        return this.requestUrl(`http://${host}${portString}${reqPath}`, options, headers);
    }

    /**
     * Execute a request to a service within the cluster
     * @param {String} host A string like "my-api" or "my-api:3000"
     * @param {String} path A string like "/users/5"
     * @param {Object} options Node Request options
     * @param {Object} headers Additional headers
     * @return {Promise.<CustomResponse>}
     */
    requestUrl(url, options = {}, headers = {}) {
        const reqOptions = _.merge(
            {},
            this.defaultReqOptions,
            { url, headers },
            options
        );

        if (this.log) {
            this.log.trace(reqOptions);
        }

        return new Promise((resolve, reject) => {
            request(
                reqOptions,
                (error, response, body) => {
                    if (this.log) {
                        this.log.trace({error, method: reqOptions.method, url, status: response ? response.statusCode : null}, body);
                    }
                    if (error) {
                        return reject(error);
                    }
                    if (this.log && reqOptions.gzip && !('content-encoding' in response.headers && response.headers['content-encoding'] === 'gzip')) {
                        this.log.warn(`No gzip encoded response from ${reqOptions.url}`);
                    }

                    const result = {
                      statusCode: response.statusCode,
                      body,
                      response,
                    };

                    let res = null;
                    try {
                        res = typeof body === 'string' && `${response.headers['content-type']}`.toLowerCase() === 'application/json' ? JSON.parse(body) : body;
                    } catch (e) {
                        const err = new Error(`Can't parse json: ${body}`);
                        err.result = result;
                        reject(err);
                    }

                    if (!res) {
                        const err = new Error(`Can't decode response body: ${body}`);
                        err.result = result;
                        return reject();
                    }
                    result.body = res;

                    this.validateResponse(result)
                        .then(() => resolve(result))
                        .catch(reject);
                }
            );
        });
    }

    /**
     * Validate response
     * @param {Response|CustomResponse} response
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
        error.body = response.body;
        return Promise.reject(error);
    }

    /**
     * Validate response
     * @param {Response|CustomResponse} response
     * @return {Promise.<Object>}
     */
    validateResponse(response) {
        return this.validateResponseBody(response).then(r => r.data);
    }
}

/* eslint-enable class-methods-use-this */

module.exports = ClusterRequest;
