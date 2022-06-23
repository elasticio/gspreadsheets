const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { columnToLetter } = require('../common');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

const HEADER = 'header';
const ARRAY = 'array';

async function processAction(msg, cfg) {
  this.logger.info('Start action %j, %j', msg, cfg);
  const quotaManager = new QuotaManager(cfg);
  await quotaManager.rateLimit();
  return messages.newMessageWithBody(msg.body);
}

async function getUpsertCriteria(cfg) {
  const { dimension, mode } = cfg;
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const selectModel = {};
  const query = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const qValues = query.data.values;
  if (!qValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  if (dimension === 'ROWS') {
    const firstRow = qValues[0];
    if (mode === HEADER || mode === undefined) {
      firstRow.forEach((item) => {
        selectModel[item] = item;
      });
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstRow.length + 1; i++) {
        const letter = columnToLetter(i);
        selectModel[letter] = letter;
      }
    }
  } else if (dimension === 'COLUMNS') {
    const firstColumn = [];
    qValues.forEach((val) => {
      firstColumn.push(val[0]);
    });
    this.logger.info('firstColumn %j', firstColumn);
    if (mode === HEADER || mode === undefined) {
      firstColumn.forEach((item) => {
        selectModel[item] = item;
      });
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstColumn.length + 1; i++) {
        selectModel[i] = i;
      }
    }
  } else {
    throw new Error(` Unsupported dimension: ${dimension}`);
  }
  return selectModel;
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
module.exports.getUpsertCriteria = getUpsertCriteria;