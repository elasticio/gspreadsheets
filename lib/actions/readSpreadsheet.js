const { messages } = require('elasticio-node');
const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

async function processAction(msg, cfg) {
  this.logger.info('Starting Read Spreadsheet Action');
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  await quotaManager.rateLimit();
  const result = await oAuth2Client.callFunction(
    oAuth2Client.getSpreadsheet, { majorDimension: cfg.dimension },
  );
  return messages.newMessageWithBody(result.data);
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
