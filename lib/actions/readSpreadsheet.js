const { messages } = require('elasticio-node');
const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

async function processAction(msg, cfg) {
  this.logger.info('Starting Read Spreadsheet Action');
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  await quotaManager.rateLimit();
  const result = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet2.bind(msg.body.worksheetId),
    msg.body);
  return messages.newMessageWithBody(result.data);
}

async function getMetaModel(cfg) {
  console.log(1, await listWorksheets(cfg));
  return {
    in: {
      type: 'objects',
      properties: {
        worksheetId: {
          type: 'string',
          required: true,
          enum: await listWorksheets(cfg),
        },
      },
    },
    out: {},
  };
}

module.exports.process = processAction;
module.exports.getMetaModel = getMetaModel;
module.exports.listSpreadsheets = listSpreadsheets;
