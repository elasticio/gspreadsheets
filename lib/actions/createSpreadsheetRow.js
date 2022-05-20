/* eslint-disable no-use-before-define,max-len */
const logger = require('@elastic.io/component-logger')();
const { google } = require('googleapis');
const { messages } = require('elasticio-node');
const retry = require('async-retry');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { getRetriesFromConfig } = require('../common');

const HEADER = 'header';
const ARRAY = 'array';

// eslint-disable-next-line no-unused-vars
async function processAction(msg, cfg, snapshot) {
  let values = [];
  this.logger.info(JSON.stringify(cfg, null, 2));
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const googleClient = oAuth2Client.client;
  const sheetsClient = google.sheets({ version: 'v4', auth: googleClient });
  if (cfg.mode === HEADER || cfg.mode === undefined) {
    await quotaManager.rateLimit();
    const query = await getSpreadsheet.call(this, sheetsClient, cfg);
    query.data.values[0]
      .map(v => v.split(' ').join(''))
      .forEach(v => values.push(msg.body[v] || ''));
  }
  if (cfg.mode === ARRAY) {
    // eslint-disable-next-line prefer-destructuring
    values = msg.body.values;
  }
  await quotaManager.rateLimit();
  const result = await writeToSpreadsheet.call(this, sheetsClient, cfg, values);
  return messages.newMessageWithBody(result.data);
}

// for now sailor hasn't opportunity log messages and emit something from load Metadata context
const context = { logger, emit: (emitType) => { logger.warn(`Can not call ${emitType} from load Metadata context.`); } };

async function listSpreadsheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, context);
  const result = await googleOauth2Client.listOfSpreadsheets();
  logger.trace('Got list of spreadsheets');
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, context);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  logger.trace('Got list of worksheets');
  return result;
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
    const googleClient = oAuth2Client.client;
    const sheetsClient = google.sheets({ version: 'v4', auth: googleClient });
    const query = await getSpreadsheet.call(this, sheetsClient, cfg);
    const firstRow = query.data.values[0];
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

async function getSpreadsheet(sheets, cfg) {
  const {
    spreadsheetId,
    worksheetId,
  } = cfg;
  const retries = getRetriesFromConfig(cfg);
  try {
    return await retry(async () => {
      this.logger.debug('Trying to get spreadsheet rows...');
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: worksheetId,
      });
      this.logger.debug('Spreadsheet rows retrieved successfully');
      return res;
    },
    {
      retries,
    });
  } catch (err) {
    throw new Error(`Could not read rows from a spreadsheet. Error: ${err.message}`);
  }
}

async function writeToSpreadsheet(sheetsClient, cfg, values) {
  const {
    spreadsheetId,
    worksheetId,
  } = cfg;
  const retries = getRetriesFromConfig(cfg);
  try {
    return await retry(async () => {
      this.logger.debug('Trying to write a row to spreadsheet...');
      const res = await sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: worksheetId,
        valueInputOption: 'RAW',
        resource: {
          majorDimension: 'ROWS',
          values: [values],
        },
      });
      this.logger.debug('Spreadsheet row was written successfully');
      return res;
    },
    {
      retries,
    });
  } catch (err) {
    throw new Error(`Could not write a row to a spreadsheet. Error: ${err.message}`);
  }
}

module.exports.process = processAction;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
module.exports.getMetaModel = getMetaModel;
