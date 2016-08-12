var oAuthUtils = require('./oauth-utils.js');
var _ = require('lodash-node');
var http = require("q-io/http");
var util = require('util');
var Q = require('q');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(process.env.GOOGLE_APP_ID,
    process.env.GOOGLE_APP_SECRET,
    process.env.REDIRECT_URL || "https://app.elastic.io/callback/oauth2");

exports.listSpreadsheets = listSpreadsheets;
exports.fetchSpreadsheetData = fetchSpreadsheetData;
exports.getMetaModel = getMetaModel;

/**
 * This function returns a list of all spreadsheets available by given account in a format
 *
 * {
 *    "x1§2l4kjlkjh23l4kj13k"
 *       : "Debitoor Product Sample"
 * }
 *
 * @param cfg
 * @param cb
 */
function listSpreadsheets(cfg, cb) {
    var drive = google.drive('v3');

    var that = this;

    if (!cfg.oauth) {
        return cb('Missing oauth access token');
    }

    oauth2Client.setCredentials(cfg.oauth);

    var refreshToken = Q.ninvoke(oauth2Client, "refreshAccessToken");

    var fetchFiles = Q.nfcall(drive.files.list, {
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        pageSize: 1000,
        auth: oauth2Client
    });

    refreshToken
        .then(onTokenReceived)
        .then(onSuccess)
        .fail(onError)
        .done();

    function onTokenReceived(token) {
        console.log("Have got new token", token[0]);
        // Updating token stored in DB
        that.emit('updateKeys', {oauth: token[0]});
        return fetchFiles;
    }

    function onSuccess(response) {
        var result = {};
        if (!response[0].files) {
            throw new Error("Unexpected result of file listings");
        }
        response[0].files.forEach(function transformAPIResult(value) {
            result[value.id] = value.name;
        });
        cb(null, result);
    }

    function onError(err) {
        console.error(err.stack || err);
        cb(err);
    }
}

/**
 * This function returns a promise that will fetch spreadsheet data
 * the number of rows specified in rows parameter, e.g. when 3 then top 3 rows
 *
 * @param rows number of rows from top to fetch
 * @param cfg
 */
function fetchSpreadsheetData(rows, emiter, cfg) {
    var sheets = google.sheets('v4');
    oauth2Client.setCredentials(cfg.oauth);
    var refreshToken = Q.ninvoke(oauth2Client, "refreshAccessToken");

    // This promise will fetch first 3 rows of the spreadsheet
    var fetchFirstRows = Q.nfcall(sheets.spreadsheets.values.get, {
        auth: oauth2Client,
        spreadsheetId: cfg.spreadsheetId,
        range: '1:' + rows,
        majorDimension: "ROWS",
        dateTimeRenderOption: "FORMATTED_STRING"
    });

    function onTokenReceived(token) {
        console.log("Have got new token", token[0]);
        // Updating token stored in DB
        emiter.emit('updateKeys', {oauth: token[0]});
        return fetchFirstRows;
    }

    return refreshToken.then(onTokenReceived);
}

/**
 * This function returns a metadata based on the incoming configuration. Incoming configuration
 * should contain a field 'spreadsheetURL' that contains a URL of the spreadsheet
 *
 * It takes a first worksheet from the spreadsheet and fetches metadata from it
 *
 * @param cfg
 * @param cb
 */
function getMetaModel(cfg, cb) {

    fetchSpreadsheetData(3, this, cfg).spread(onSuccess).fail(onError).done();

    function onSuccess(result) {
        if (!result.values || result.values.length == 0) {
            throw new Error("Can not find any values in the first row of the google spreadsheet");
        }
        var firstRow = result.values[0];
        var metadata = {
            in: {}, // Empty as we are in trigger
            out: {
                "type": "object",
                "properties": {
                    rowIndex: {
                        type: 'number',
                        title: 'Row index',
                        required: true
                    }
                    // Other properties will be filled later
                }
            }
        };
        firstRow.forEach(function createMetadata(value, index) {
            metadata.out.properties['col' + index] = {
                type: "string",
                title: value
            };
        });
        cb(null, metadata);
    }

    function onError(err) {
        console.error(err.stack || err);
        cb(err);
    }
}
