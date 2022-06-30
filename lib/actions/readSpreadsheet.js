/* eslint-disable consistent-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const { messages } = require('elasticio-node');
const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

async function processAction(msg, cfg) {
  this.logger.info('Starting Read Spreadsheet Action');
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  await quotaManager.rateLimit();
  const { data } = await oAuth2Client.callFunction(
    oAuth2Client.getSpreadsheet, { majorDimension: cfg.dimension },
  );
  const { values, range, majorDimension } = data;
  this.logger.info(`Result meta: "range": "${range}", "majorDimension": "${majorDimension}"`);
  if (cfg.emitBehaviour === 'fetchAll') {
    return messages.newMessageWithBody(values);
  }
  for (const row of values) {
    await this.emit('data', messages.newMessageWithBody(row));
  }
}

async function getMetaModel() {
  return {
    in: {
      type: 'objects',
      properties: {
      },
    },
    out: {},
  };
}

module.exports.process = processAction;
module.exports.getMetaModel = getMetaModel;
module.exports.listWorksheets = listWorksheets;
module.exports.listSpreadsheets = listSpreadsheets;
