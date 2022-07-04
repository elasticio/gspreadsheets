/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const { messages } = require('elasticio-node');
const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');
const { columnToLetter } = require('../common');

// eslint-disable-next-line arrow-body-style
const beautify = (tableHeaders, tableValues) => {
  return tableValues.map((row) => {
    const res = {};
    row.forEach((cellValue, index) => { res[tableHeaders[index]] = cellValue; });
    return res;
  });
};

// returns [1..N] for "dimension=ROWS" and ['A'..'XXX'] for "dimension=COLUMNS"
const getGoogleGridHeaders = (tableValues, dimension) => {
  const maxCellsCount = Math.max(...tableValues.map(cells => cells.length));
  const googleGridHeadersAsNums = Array.from({ length: maxCellsCount }, (_, i) => i + 1); // array from 1 to N
  if (dimension === 'ROWS') return googleGridHeadersAsNums;
  return googleGridHeadersAsNums.map(columnToLetter);
};

async function processAction(msg, cfg) {
  this.logger.info('Starting Read Spreadsheet Action');
  const { useFirstRowAsHeader, emitBehaviour, dimension } = cfg;
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  await quotaManager.rateLimit();
  const { data } = await oAuth2Client.callFunction(
    oAuth2Client.getSpreadsheet, { majorDimension: dimension },
  );
  const { values, range, majorDimension } = data;
  this.logger.info(`Result meta: "range": "${range}", "majorDimension": "${majorDimension}"`);
  if (useFirstRowAsHeader === 'no') {
    values.unshift(getGoogleGridHeaders(values, dimension));
  }
  const resultTable = beautify(values.shift(), values);
  if (emitBehaviour === 'fetchAll') {
    this.logger.info('Read Spreadsheet Action is done, emitting all values at once..');
    return messages.newMessageWithBody(resultTable);
  }
  this.logger.info('Read Spreadsheet Action is done, emitting values one by one..');
  for (const row of resultTable) {
    await this.emit('data', messages.newMessageWithBody(row));
  }
}

module.exports.process = processAction;
module.exports.listWorksheets = listWorksheets;
module.exports.listSpreadsheets = listSpreadsheets;
