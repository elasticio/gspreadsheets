var util = require("util");
var request = require('request');

/**
 * This function creates a header value for Authentication header
 * using Basic base64 authentication encoding.
 *
 * For example username 'foo' and password 'bar' will be transformed into
 *
 * 'Basic Zm9vOmJhcg=='
 *
 * @param username
 * @param password
 * @return {String}
 */
exports.createBasicAuthorization = function createBasicAuthorization(username, password) {
    'use strict';

    var credentials = util.format("%s:%s", username, password);

    return 'Basic ' + new Buffer(credentials).toString('base64');
};

/**
 * This function fetches JSON response and do a necessary parsing and control
 * of the exception handling in case unexpected return code is returned
 *
 * It accept following parameters as properties of the first parameter
 *
 * url - required url to be fetched
 * auth - optional authentication header value
 * headers - optional hash with header values,
 * please note authentication header will be added automatically as well as Accept header
 *
 * @param params
 * @param cb
 */
exports.getJSON = function getJSON(params, cb) {
    'use strict';

    var url = params.url;
    var method = params.method || "get";
    var headers = params.headers || {};
    var expectedStatus = params.statusExpected || 200;

    if (params.auth) {
        headers.Authorization = params.auth;
    }

    console.log('Sending %s request to %s', method, url);

    request[method.toLowerCase()]({
        url: url,
        agent: false,
        headers: headers,
        form: params.form,
        json: params.json
    }, function checkResponse(err, resp, body) {
        if (err) {
            console.error('Failed to fetch JSON from ' + url + " with error: " + err);
            return cb(err);
        }
        if (resp.statusCode === expectedStatus) {
            var result = body;
            try {
                if (typeof body === "string") {
                    result = JSON.parse(body);
                }
            } catch (parseError) {
                console.error('Failed to parse JSON', body);
                cb(parseError);
            }
            if (result) {
                try {
                    console.log('Have got %d response from %s to %s', expectedStatus, method, url);
                    cb(null, result);
                } catch (e) {
                    console.error('Exception happened when passing data down the chain', e);
                }
            } else {
                console.log('Have got empty response');
                cb(null, result);
            }
        } else {
            var msg = util.format(
                'Unexpected return code %d, expected %d, body %s',
                resp.statusCode,
                expectedStatus,
                body
            );
            console.error(msg);

            var errorResponse = new Error(msg);
            errorResponse.responseBody = body;
            errorResponse.statusCode = resp.statusCode;
            cb(errorResponse);
        }
    });
};