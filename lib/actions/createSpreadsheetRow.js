const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

const HEADER = 'header';
const ARRAY = 'array';

async function processAction(msg, cfg) {
  let values = [];
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  if (cfg.mode === HEADER || cfg.mode === undefined) {
    await quotaManager.rateLimit();
    const query = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
    query.data.values[0]
      .map(v => v.split(' ').join(''))
      .forEach(v => values.push(msg.body[v] || ''));
  }
  if (cfg.mode === ARRAY) {
    // eslint-disable-next-line prefer-destructuring
    values = msg.body.values;
  }
  await quotaManager.rateLimit();
  const result = await oAuth2Client.callFunction(oAuth2Client.writeToSpreadsheet, values);
  return messages.newMessageWithBody(result.data);
}

async function getMetaModel(cfg) {
  this.logger.info('Start generating metadata');
  const out = {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        required: true,
      },
      tableRange: {
        type: 'string',
        required: true,
      },
      updates: {
        type: 'object',
        required: true,
        properties: {
          spreadsheetId: {
            type: 'string',
            required: true,
          },
          updatedRange: {
            type: 'string',
            required: true,
          },
          updatedRows: {
            type: 'numeric',
            required: true,
          },
          updatedColumns: {
            type: 'numeric',
            required: true,
          },
          updatedCells: {
            type: 'numeric',
            required: true,
          },
        },
      },
    },
  };
  const input = {
    type: 'object',
    properties: {
    },
  };
  if (cfg.mode === HEADER || cfg.mode === undefined) {
    const oAuth2Client = new GoogleOauth2Client(cfg, this);
    const query = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
    const firstRow = query.data.values ? query.data.values[0] : [];
    if (firstRow.length === 0) {
      throw new Error('Input Mode: "First Row As Headers" requires first row to have at least one cell with value. Check: Common Errors section in docs.');
    }
    firstRow.forEach((v) => {
      if (v === '' || v === undefined || v === null) {
        this.logger.error('Found cell with empty value in header row');
        throw new Error('Input Mode: "First Row As Headers" requires cells in first row to be not empty. Check: Common Errors section in docs.');
      } else {
        if (input.properties[v] !== undefined) {
          throw new Error('Input Mode: "First Row As Headers" requires cells in first row to be unique. Check: Common Errors section in docs.');
        }
        input.properties[v.split(' ').join('')] = {
          title: v,
          description: v,
          type: 'string',
        };
      }
    });
  }
  if (cfg.mode === ARRAY) {
    input.properties = {
      values: {
        type: 'array',
      },
    };
  }
  const result = {
    out,
    in: input,
  };
  this.logger.info('Finish generating metadata');
  return result;
}

module.exports.process = processAction;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
module.exports.getMetaModel = getMetaModel;
