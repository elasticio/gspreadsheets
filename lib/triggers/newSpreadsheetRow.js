/* eslint-disable max-len,no-use-before-define */
const logger = require('@elastic.io/component-logger')();
const { google } = require('googleapis');
const { messages } = require('elasticio-node');
const retry = require('async-retry');

const { GoogleOauth2Client } = require('../client');
const {
  transformToOutputStructure,
  columnToLetter,
  getRetriesFromConfig,
} = require(
  '../common',
);

async function processTrigger(msg, cfg, snapshot) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, this);
  await googleOauth2Client.buildClient();
  this.logger.info('Call Google Drive API for getting modifiedTime of spreadsheet');
  const driveClient = google.drive({ version: 'v3', auth: googleOauth2Client.client });
  const drive = await getDrive.call(this, driveClient, cfg);
  this.logger.trace('Got a response');
  const includeHeader = cfg.includeHeader === 'yes';
  let snap = {
    modifiedTime: snapshot.modifiedTime || 0,
    lastEmittedLine: snapshot.lastEmittedLine || 0,
  };
  if (cfg.fetchAllData === 'yes') {
    snap = {
      modifiedTime: 0,
      lastEmittedLine: 0,
    };
  }
  const newModifiedTime = new Date(drive.data.modifiedTime).getTime();
  this.logger.debug('Snapshot modifiedTime: $s', snap.modifiedTime);
  this.logger.debug('Actual modifiedTime: $s', newModifiedTime);
  const sheetsClient = google.sheets(
    { version: 'v4', auth: googleOauth2Client.client },
  );
  const ranges = [];
  if (includeHeader) {
    // skip header line when empty snapshot
    snap.lastEmittedLine += snap.lastEmittedLine === 0 ? 1 : 0;
    // load headers according to dimension
    if (cfg.dimension === 'ROWS') {
      ranges.push(`${cfg.worksheetName}!A1:${columnToLetter(5000)}1`);
      ranges.push(`${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:${columnToLetter(5000)}${snap.lastEmittedLine + 1000}`);
    } else if (cfg.dimension === 'COLUMNS') {
      ranges.push(`${cfg.worksheetName}!A1:A5000`);
      ranges.push(
        `${cfg.worksheetName}!${columnToLetter(snap.lastEmittedLine + 1)}1:${columnToLetter(snap.lastEmittedLine + 1000)}5000`,
      );
    }
    // when header disabled
  } else if (cfg.dimension === 'ROWS') {
    ranges.push(`${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:${columnToLetter(5000)}${snap.lastEmittedLine + 1000}`);
  } else if (cfg.dimension === 'COLUMNS') {
    ranges.push(`${cfg.worksheetName}!${columnToLetter(snap.lastEmittedLine + 1)}1:${columnToLetter(
      snap.lastEmittedLine + 1000,
    )}5000`);
  }

  const requestParams = {
    spreadsheetId: cfg.spreadsheetId,
    ranges,
    majorDimension: cfg.dimension,
    valueRenderOption: 'UNFORMATTED_VALUE',
  };
  const responseRange = await batchGetRows.call(this, sheetsClient, cfg, requestParams);
  const mergedArray = responseRange.data.valueRanges.reduce(
    (accumulator, currentValue) => {
      if (currentValue.values) {
        accumulator.push(...currentValue.values);
      }
      return accumulator;
    }, [],
  );

  if (mergedArray.length > includeHeader ? 1 : 0) {
    const result = transformToOutputStructure(cfg.dimension, mergedArray,
      includeHeader);

    this.logger.trace('Data transformed');

    result.forEach(
      item => this.emit('data', messages.newMessageWithBody(item)),
    );
    snap.lastEmittedLine += result.length;
  }
  snap.modifiedTime = newModifiedTime;
  this.emit('snapshot', snap);
  this.logger.trace('Snapshot emitted');
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

async function getDrive(driveClient, cfg) {
  const retries = getRetriesFromConfig(cfg);
  try {
    return await retry(async () => {
      this.logger.debug('Trying to get a spreadsheet...');
      const res = await driveClient.files.get({
        fileId: cfg.spreadsheetId,
        fields: 'id,name,modifiedTime',
      });
      this.logger.debug('Got a spreadsheet successfully');
      return res;
    },
    {
      retries,
    });
  } catch (err) {
    throw new Error(`Could not get a spreadsheet. Error: ${err.message}`);
  }
}

async function batchGetRows(sheetsClient, cfg, requestParams) {
  const retries = getRetriesFromConfig(cfg);
  try {
    return await retry(async () => {
      this.logger.debug('Trying to get a batch of rows from spreadsheet...');
      const res = await sheetsClient.spreadsheets.values.batchGet(requestParams);
      this.logger.debug('Got a batch of rows from spreadsheet successfully');
      return res;
    },
    {
      retries,
    });
  } catch (err) {
    throw new Error(`Could not get a batch of rows from spreadsheet. Error: ${err.message}`);
  }
}

module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
module.exports.process = processTrigger;
