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
    var lastUpdate = snapshot.lastUpdate || 0;
    snapshot.rows = snapshot.rows || [];
    var rows = snapshot.rows;

    common.fetchWorkbook.call(this, cfg)
        .spread(onSuccess)
        .fail(onError)
        .done(onEnd);

    function onSuccess(feed, newCfg) {

        console.log('Successfully fetched workbook');

        var updated = new Date(feed.updated.$t).getTime();

        console.log('Worksheet updated at %s and snapshot is %s', updated, lastUpdate);
        if (updated === lastUpdate) {
            console.log('No updates detected in the worksheet');
            return;
        }

        snapshot.lastUpdate = updated;

        if (!feed.entry) {
            console.log('No rows detected in the worksheet');
            return onEnd();
        }

        var index = 0;
        feed.entry.forEach(processFeedEntry);

        function processFeedEntry(entry) {
            var crc = crypt.getCRC(entry.content);
            if (crc != rows[index]) {
                var row = {
                    'rowIndex': index
                };
                // Value changed
                common.extractCellValues(entry, feed, function processCell(field, value) {
                    row[field] = value;
                });
                that.emit('data', messages.newMessageWithBody(row));
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
