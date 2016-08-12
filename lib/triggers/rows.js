var messages = require('elasticio-node').messages;
var crypt = require('elasticio-node').crypt;
var common = require('../common.js');

exports.process = process;
exports.listSpreadsheets = common.listSpreadsheets;
exports.getMetaModel = common.getMetaModel;

/**
 * This is a main function it should do following:
 *  - fetch a workbook from the spreadsheet URL from cfg.spreadsheetURL
 *  - check if it was modified since last date stored in snapshot
 *
 * @param msg
 * @param cfg
 */
function process(msg, cfg, snapshot) {

    console.log('Request to retrieve rows arrived');

    var that = this;
    var snapshot = snapshot || {};
    snapshot.rows = snapshot.rows || [];
    var rows = snapshot.rows;

    common.fetchSpreadsheetData(1000, this, cfg)
        .spread(onSuccess)
        .fail(onError)
        .done(onEnd);

    /**
     * This function will transform [1,2,3] to { 'col0': 1, 'col1': 2, 'col2': 3 }
     *
     * @param row
     */
    function rowToObject(row) {
        var result = {};
        row.forEach(function toProperty(value, index) {
            result['col' + index] = value;
        });
        return result;
    }

    function onSuccess(result) {
        var data = result.values;

        console.log('Successfully fetched %s rows', rows.length);

        if (data.length == 0) {
            console.log('No rows detected in the worksheet');
            return onEnd();
        }

        var index = 0;

        data.forEach(processFeedEntry);

        function processFeedEntry(row) {
            var object = rowToObject(row);
            object.rowIndex = index;
            var crc = crypt.getCRC(object);
            if (crc != rows[index]) {
                that.emit('data', messages.newMessageWithBody(object));
            }
            rows[index++] = crc;
        }
    }

    function onError(err) {
        console.error(err.stack || err);
        that.emit('error', err);
    }

    function onEnd() {
        that.emit('snapshot', snapshot);
        that.emit('end');
    }
}
