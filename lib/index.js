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

    /**
     * Get the full URL string from the host and path
     * @param {String} host Domain or service
     * @param {String} path Request endpoint
     * @return {String}
     */
    getUrl(host, path) {
        let portString = `:${this.defaultPort}`;
        if (/:\d+/.test(`${host}`)) {
            portString = '';
        }
        let reqPath = path;
        if (`${path}`.indexOf('/') !== 0) {
            reqPath = `/${reqPath}`;
        }
        return `http://${host}${portString}${reqPath}`;
    }

    request(host, path, options = {}, headers = {}) {
        return this.requestUrl(this.getUrl(host, path), options, headers);
    }

    /**
     * Get options object for Request with defaults
     * @param {String} url The URL to request
     * @param {Object} options Node Request options
     * @param {Object} headers Additional headers
     * @return {*}
     */
    getRequestOptions(url, options = {}, headers = {}) {
        return _.merge(
            {},
            this.defaultReqOptions,
            { url, headers },
            options
        );
    }

    /**
     * Execute a request to a service within the cluster
     * @param {String} url The URL to request
     * @param {Object} options Node Request options
     * @param {Object} headers Additional headers
     * @return {Promise.<CustomResponse>}
     */
    requestUrl(url, options = {}, headers = {}) {
        const reqOptions = this.getRequestOptions(url, options, headers);

        if (this.log) {
            this.log.trace(reqOptions);
        }

        return new Promise((resolve, reject) => {
            request(
                reqOptions,
                (error, response, body) => {
                    if (this.log) {
                        this.log.trace({
                          error,
                          ..._.pick(reqOptions, ['uri', 'url', 'baseUrl', 'method', 'qs']),
                          status: response ? response.statusCode : null,
                        }, body);
                    }
                    if (error) {
                        return reject(error);
                    }
                    if (this.log && reqOptions.gzip && !('content-encoding' in response.headers && response.headers['content-encoding'] === 'gzip')) {
                        this.log.debug(`No gzip encoded response from ${reqOptions.url}`);
                    }

                    const result = {
                      statusCode: response.statusCode,
                      body,
                      response,
                    };

                    let res = null;
                    try {
                        res = typeof body === 'string' ? JSON.parse(body) : body;
                    } catch (e) {
                        if (`${response.headers['content-type']}`.toLowerCase() === 'application/json') {
                          const err = new Error(`Can't parse json: ${body}`);
                          err.result = result;
                          return reject(err);
                        }
                        res = body;
                    }

                    if (_.isNull(res)) {
                        const err = new Error(`Can't decode response body: ${body}`);
                        err.result = result;
                        return reject(err);
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
     * Get the Request function instead of executing it
     * @param {String} host Domain or service
     * @param {String} path Request endpoint
     * @param {Object} options Node Request options
     * @param {Object} headers Additional headers
     * @return {Function}
     */
    getRequest(host, path, options = {}, headers = {}) {
        const reqOptions = this.getRequestOptions(this.getUrl(host, path), options, headers);

        if (this.log) {
            this.log.trace(reqOptions);
        }

        return request.defaults(reqOptions);
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
        return this.validateResponseBody(response).then(r => _.isPlainObject(r) ? r.data : r);
    }
}

/* eslint-enable class-methods-use-this */

module.exports = ClusterRequest;
