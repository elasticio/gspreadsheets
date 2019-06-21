/* eslint-disable max-len */

const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { transformToOutputStructure, columnToLetter, letterToColumn } = require(
  '../common',
);

async function processTrigger(msg, cfg, snapshot) {
  this.logger.trace('Message: %j', msg);
  this.logger.trace('Configuration: %j', cfg);
  this.logger.trace('Snapshot: %j', snapshot);

  const googleOauth2Client = new GoogleOauth2Client(cfg);

  this.logger.info(
    'Call Google Drive API for getting modifiedTime of spreadsheet %s',
    cfg.spreadsheetId,
  );
  const drive = google.drive(
    { version: 'v3', auth: googleOauth2Client.client },
  );
  const sheet = await drive.files.get({
    fileId: cfg.spreadsheetId,
    fields: 'id,name,modifiedTime',
  });
  this.logger.trace('Got response: %j', sheet);
  const includeHeader = cfg.includeHeader === 'yes';

  const snap = {
    modifiedTime: snapshot.modifiedTime || 0,
    lastEmittedLine: snapshot.lastEmittedLine || 0,
  };
  const newModifiedTime = new Date(sheet.data.modifiedTime).getTime();
  this.logger.info('Snapshot modifiedTime: $s', snap.modifiedTime);
  this.logger.info('Actual modifiedTime: $s', newModifiedTime);

  if (snap.modifiedTime < newModifiedTime) {
    const sheets = google.sheets(
      { version: 'v4', auth: googleOauth2Client.client },
    );

    const ranges = [];

    if (includeHeader) {
      // skip header line
      snap.lastEmittedLine += 1;
      // load headers according to dimension
      if (cfg.dimension === 'ROWS') {
        ranges.push(`${cfg.worksheetName}!A1:ZZZ1`);
      } else if (cfg.dimension === 'COLUMNS') {
        ranges.push(`${cfg.worksheetName}!A1:A${letterToColumn('ZZZ')}`);
      }
    }

    // Load data according to dimensions
    if (cfg.dimension === 'ROWS') {
      ranges.push(`${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:ZZZ${snap.lastEmittedLine + 1001}`);
    } else if (cfg.dimension === 'COLUMNS') {
      ranges.push(`${cfg.worksheetName}!${columnToLetter(snap.lastEmittedLine + 1)}1:${columnToLetter(snap.lastEmittedLine + 1001)}${letterToColumn('ZZZ')}`);
    }


    const requestParams = {
      spreadsheetId: cfg.spreadsheetId,
      ranges,
      majorDimension: cfg.dimension,
    };

    this.logger.info('Google API request parameters: %j', requestParams);

    const responseRange = await sheets.spreadsheets.values.batchGet(requestParams);

    this.logger.trace('Google API response: %j', responseRange);

    const mergedArray = responseRange.data.valueRanges.reduce(
      (accumulator, currentValue) => {
        accumulator.push(...currentValue.values);
        return accumulator;
      }, [],
    );

    await googleOauth2Client.checkAndUpdateCredentials(googleClient.credentials);

    this.logger.trace('Merged array: %j', mergedArray);

    if (responseRange.data.valueRanges.length > includeHeader ? 1 : 0) {
      const result = transformToOutputStructure(cfg.dimension, mergedArray,
        includeHeader);

      this.logger.trace('Transformed data: %j', result);

      result.forEach(
        item => this.emit('data', messages.newMessageWithBody(item)),
      );
      snap.lastEmittedLine += mergedArray.length;
    }
    snap.modifiedTime = newModifiedTime;
    this.emit('snapshot', snap);
    this.logger.info('Emitted snapshot: %j', snap);
  }
}

async function listSpreadsheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfSpreadsheets();
  console.log(result);
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  console.log(result);
  return result;
}

module.exports.process = processTrigger;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
