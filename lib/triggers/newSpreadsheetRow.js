/* eslint-disable max-len */

const logger = require('@elastic.io/component-logger')();
const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { transformToOutputStructure, columnToLetter } = require(
  '../common',
);

async function processTrigger(msg, cfg, snapshot) {
  this.logger.trace('Message: %j', msg);
  this.logger.trace('Configuration: %j', cfg);
  this.logger.trace('Snapshot: %j', snapshot);

  const googleOauth2Client = new GoogleOauth2Client(cfg, this);

  this.logger.info('Call Google Drive API for getting modifiedTime of spreadsheet %s', cfg.spreadsheetId);

  const drive = google.drive({ version: 'v3', auth: googleOauth2Client.client });
  const sheet = await drive.files.get({
    fileId: cfg.spreadsheetId,
    fields: 'id,name,modifiedTime',
  });
  this.logger.trace('Got response: %j', sheet);
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

  const newModifiedTime = new Date(sheet.data.modifiedTime).getTime();
  this.logger.debug('Snapshot modifiedTime: $s', snap.modifiedTime);
  this.logger.debug('Actual modifiedTime: $s', newModifiedTime);

  const sheets = google.sheets(
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
    valueRenderOption: 'FORMULA',
  };

  this.logger.trace('Google API request parameters: %j', requestParams);

  const responseRange = await sheets.spreadsheets.values.batchGet(requestParams);

  this.logger.trace('Google API response: %j', responseRange.data);

  const mergedArray = responseRange.data.valueRanges.reduce(
    (accumulator, currentValue) => {
      if (currentValue.values) {
        accumulator.push(...currentValue.values);
      }
      return accumulator;
    }, [],
  );

  this.logger.trace('Merged array: %j', mergedArray);

  if (mergedArray.length > includeHeader ? 1 : 0) {
    const result = transformToOutputStructure(cfg.dimension, mergedArray,
      includeHeader);

    this.logger.trace('Transformed data: %j', result);

    result.forEach(
      item => this.emit('data', messages.newMessageWithBody(item)),
    );
    snap.lastEmittedLine += result.length;
  }
  snap.modifiedTime = newModifiedTime;
  this.emit('snapshot', snap);
  this.logger.trace('Emitted snapshot: %j', snap);
}

// for now sailor hasn't opportunity log messages and emit something from load Metadata context
const context = { logger, emit: (emitType) => { logger.warn(`Can not call ${emitType} from load Metadata context.`); } };

async function listSpreadsheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, context);
  const result = await googleOauth2Client.listOfSpreadsheets();
  logger.trace('Got list of spreadsheets: %j', result);
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, context);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  logger.trace('Got list of worksheets: %j', result);
  return result;
}

module.exports.process = processTrigger;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
