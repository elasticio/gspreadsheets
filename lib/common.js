var oAuthUtils = require('./oauth-utils.js');
var _ = require('lodash-node');
var http = require("q-io/http");
var util = require('util');
var Q = require('q');

exports.allSpreadsheets = allSpreadsheets;
exports.getMetaModel = getMetaModel;
exports.fetchWorkbook = fetchWorkbook;
exports.extractCellValues = extractCellValues;
exports.appendParams = appendParams;

/**
 * This method append an access_token to URL
 *
 * @param url
 * @param conf
 * @returns {*}
 */
function appendParams(url, conf) {
    return url + util.format('?alt=json&access_token=%s', conf.oauth.access_token);
}

/**
 * This functions returns a promise that will fetch workbook
 * from he worksheet URL in configuration. It expects a ```cfg.oauth``` and ```cfg.spreadsheetURL``` to be set
 *
 * Promise will fulfill with the feed of the worksheet
 *
 * @param cfg
 */
function fetchWorkbook(cfg) {

    var defered = Q.defer();
    var spreadsheetURL = cfg["spreadsheetURL"];
    var newCfg;

    if (!spreadsheetURL) {
        defered.reject('Spreadsheet URL should be set in configuration');
        return defered.promise;
    }

    function fetchSpreadsheet(updatedCfg) {
        newCfg = updatedCfg;
        console.log('Fetching spreadsheet url=%s', spreadsheetURL);
        return http.read(appendParams(spreadsheetURL, newCfg));
    }

    function findAndFetchWorksheet(body) {
        // Now select first worksheet in the spreadsheet
        var response = JSON.parse(body.toString('utf-8'));
        if (!response.feed) {
            throw "Feed is empty";
        }
        var first = _.first(response.feed.entry);
        var link = _.find(first.link, function findLink(link) {
            return link.rel.indexOf('listfeed') >= 0;
        });
        if (!link) {
            throw 'Can not find a link rel #listfeed in ' + JSON.stringify(first);
        }
        var worksheetUrl = link.href;
        console.log('Fetching worksheet url=%s', worksheetUrl);
        return http.read(appendParams(worksheetUrl, newCfg));
    }

    function complete(body) {
        var response = JSON.parse(body.toString('utf-8'));
        var feed = response.feed;
        defered.fulfill([feed, newCfg]);
    }

    oAuthUtils.refreshTokenPromise('gspreadsheets', cfg)
        .then(fetchSpreadsheet)
        .then(findAndFetchWorksheet)
        .then(complete)
        .fail(function onError(err) {
            console.error(err.stack || err);
            defered.reject(err);
        }).done();

    return defered.promise;
}

/**
 * This function returns a list of all spreadsheets available by given account in a format
 *
 * {
 *    "https://spreadsheets.google.com/feeds/worksheets/1DLLZwg5xanRY/private/full"
 *       : "Debitoor Product Sample"
 * }
 *
 * @param cfg
 * @param cb
 */
function allSpreadsheets(cfg, cb) {
    var listAllURL = "https://spreadsheets.google.com/feeds/spreadsheets/private/full";

    if (!cfg.oauth) {
        return cb('Missing oauth access token');
    }

    oAuthUtils.refreshTokenPromise('gspreadsheets', cfg)
        .then(onTokenReceived)
        .then(onSuccess)
        .fail(onError)
        .done();

    function onTokenReceived(conf) {
        return http.read(appendParams(listAllURL, conf));
    }

    function onSuccess(body) {
        var result = {};
        var response = JSON.parse(body.toString('utf-8'));
        if (!response.feed || !response.feed.entry) {
            throw 'Returned feed is empty';
        }
        response.feed.entry.map(function addEntryToResult(entry) {
            var link = _.find(entry.link, function checkLink(link) {
                return link.rel.indexOf('schemas.google.com/spreadsheets') >= 0;
            });
            result[link.href] = entry.title.$t;
        });
        cb(null, result);
    }

    function onError(err) {
        console.error(err.stack || err);
        cb(err);
    }
}

/**
 * This function extract values out of typical representation of the worksheet cell
 *
 * row is something like
 * {
 *    foo : 'bar',
 *    hasi : 'zoo',
 *    xxx$foo : 'baz'
 * }
 *
 * nsholder is where namespaces are stored, e.g.
 *
 * {
 *      xmlns$xxx : 'asdf'
 * }
 *
 * and callback will be called with 'foo' and 'baz' values
 *
 * @param row
 * @param callback
 */
function extractCellValues(row, nsholder, callback) {

    _.keys(row).forEach(extractCellValue);

    function extractCellValue(key) {
        // Keys that we need are called xxx$foo
        // where xxx is a namespace prefix we need to check
        var attr = key.split('$');
        if (attr.length = 2) {
            var npref = attr[0];
            var field = attr[1];
            var ns = nsholder['xmlns$' + npref];
            if (ns === "http://schemas.google.com/spreadsheets/2006/extended") {
                callback(field, row[key].$t);
            }
        }
    }
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

    fetchWorkbook(cfg)
        .spread(onSuccess)
        .fail(onError)
        .done();

    function onSuccess(feed) {
        var firstRow = _.first(feed.entry);
        var metadata = {
            in: {}, // Empty as we are in trigger
            out: {
                "type": "object",
                "properties": {
                    "rowIndex": {
                        title: "Row Number",
                        type: "number",
                        required: true
                    }
                    // Other properties will be filled later
                }
            }
        };
        extractCellValues(firstRow, feed, function onExtracted(field) {
            metadata.out.properties[field] = {
                "type": "string"
            };
        });
        cb(null, metadata);
    }

    function onError(err) {
        console.error(err.stack || err);
        cb(err);
    }
}
