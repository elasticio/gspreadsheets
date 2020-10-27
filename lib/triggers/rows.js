/* eslint-disable */

const { messages } = require('elasticio-node');
const { crypt } = require('elasticio-node');
const common = require('../common.js');

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
  this.logger.info('Request to retrieve rows arrived');

  const that = this;
  var snapshot = snapshot || {};
  const lastUpdate = snapshot.lastUpdate || 0;
  snapshot.rows = snapshot.rows || [];
  const { rows } = snapshot;

  common.fetchWorkbook.call(this, cfg)
    .spread(onSuccess)
    .fail(onError)
    .done(onEnd);

  function onSuccess(feed, newCfg) {
    that.logger.info('Successfully fetched workbook');

    const updated = new Date(feed.updated.$t).getTime();

    that.logger.debug(`Worksheet updated at ${updated} and snapshot is ${lastUpdate}`);
    if (updated === lastUpdate) {
      that.logger.info('No updates detected in the worksheet');
      return;
    }

    snapshot.lastUpdate = updated;

    if (!feed.entry) {
      that.logger.info('No rows detected in the worksheet');
      return onEnd();
    }

    let index = 0;
    feed.entry.forEach(processFeedEntry);

    function processFeedEntry(entry) {
      const crc = crypt.getCRC(entry.content);
      if (crc != rows[index]) {
        const row = {
          rowIndex: index,
        };
        // Value changed
        common.extractCellValues(entry, feed, (field, value) => {
          row[field] = value;
        });
        that.emit('data', messages.newMessageWithBody(row));
      }
      rows[index++] = crc;
    }
  }

  function onError(err) {
    that.logger.error('Request failed');
    that.emit('error', err);
  }

  function onEnd() {
    that.emit('snapshot', snapshot);
    that.emit('end');
  }
}
