var common = require('../common.js');
var _ = require('lodash-node');
var http = require("q-io/http");
var util = require('util');

exports.process = executeAction;
exports.listSpreadsheets = common.allSpreadsheets;
exports.getMetaModel = getMetaModel;

/**
 * This function builds a meta-model for the spreadsheet
 *
 * @param cfg
 * @param cb
 */
function getMetaModel(cfg, cb) {

    common.fetchWorkbook(cfg)
        .spread(buildMetaModel)
        .fail(onError)
        .done();

    function buildMetaModel(workbook) {
        var firstRow = _.first(workbook.entry);
        var metadata = {
            out: {
                "type": "object",
                "properties": {
                    // Properties will be filled later
                }
            },
            in: {
                "type": "object",
                "properties": {
                    // Properties will be filled later
                }
            }
        };
        common.extractCellValues(firstRow, workbook, function processCell(cellName) {
            metadata.out.properties[cellName] = {
                "type": "string"
            };
            metadata.in.properties[cellName] = {
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

/**
 * This function prepares an XML payload for adding new row to the
 * google spreadsheet, sample Entry XML is:
 *
 * <entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">
 *    <gsx:sku>1</gsx:sku>
 *    <gsx:name>Demo Name</gsx:name>
 *    <gsx:description>Foo description</gsx:description>
 *    <gsx:netsalesprice>22</gsx:netsalesprice>
 * </entry>
 *
 * @param body
 * @param field
 */
function preparePayload(body, fields) {

    function processField(field) {
        if (body[field]) {
            var value = body[field];
            if (typeof value === "string") {
                value = _.escape(value);
            }
            str += util.format("\t<gsx:%s>%s</gsx:%s>\n", field, value, field);
        }
    }

    var str = '<entry xmlns="http://www.w3.org/2005/Atom" '
        + 'xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n';
    fields.forEach(processField);
    str += '</entry>';
    return str;
}

/**
 * This is a main function it should do following:
 *  - push a new row with the data from the incoming message to google spreadsheet row
 *
 * @param msg
 * @param cfg
 */
function executeAction(msg, cfg) {
    var that = this;

    common.fetchWorkbook(cfg)
        .spread(addNewRow)
        .then(pushData)
        .fail(onError)
        .done(onEnd);

    /**
     * This function returns a promise that will be ok when
     * row will be added to the GSpreadsheet
     *
     * @param workbook
     * @returns {*}
     */
    function addNewRow(workbook, newCfg) {
        var postLink = _.find(workbook.link, isPostLink);
        if (!postLink || !postLink.href) {
            return that.emit('error', "Can't find post URL in the feed JSON: " + JSON.stringify(workbook.link));
        }

        var postURL = postLink.href;
        console.log('Found URL that shall accept new lines for the worksheet url=%s', postURL);

        var fields = [];
        var firstRow = _.first(workbook.entry);
        common.extractCellValues(firstRow, workbook, function processCell(field) {
            fields.push(field);
        });

        var payload = preparePayload(msg.body || {}, fields);

        console.log('Will POST payload to URL payload=multiline\n%s', payload);
        return http.read({
            url: common.appendParams(postURL, newCfg),
            method: 'POST',
            headers: {'Content-Type': 'application/atom+xml'},
            body: [payload]
        }, checkResponse);
    }

    function isPostLink(link) {
        return link.rel === "http://schemas.google.com/g/2005#post";
    }

    function checkResponse(response) {
        return response.status === 201;
    }

    function pushData() {
        // This will fire the data event
        // for the incoming message
        // essentially propagating the data though
        that.emit('data', msg);
    }

    function onError(err) {
        console.error(err.stack || err);
        that.emit('error', err);
    }

    function onEnd() {
        that.emit('end');
    }
}