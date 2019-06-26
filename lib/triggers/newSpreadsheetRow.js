/* eslint-disable max-len */

const debug = require('debug')('NewSpreadsheetRow');
const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { transformToOutputStructure, columnToLetter, letterToColumn } = require(
  '../common',
);

async function processTrigger(msg, cfg, snapshot) {
  debug('Message: %j', msg);
  debug('Configuration: %j', cfg);
  debug('Snapshot: %j', snapshot);

  const googleOauth2Client = new GoogleOauth2Client(cfg, this);

  debug('Call Google Drive API for getting modifiedTime of spreadsheet %s', cfg.spreadsheetId);

  const drive = google.drive({ version: 'v3', auth: googleOauth2Client.client });
  const sheet = await drive.files.get({
    fileId: cfg.spreadsheetId,
    fields: 'id,name,modifiedTime',
  });
  debug('Got response: %j', sheet);
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
  debug('Snapshot modifiedTime: $s', snap.modifiedTime);
  debug('Actual modifiedTime: $s', newModifiedTime);

  if (snap.modifiedTime < newModifiedTime) {
    const sheets = google.sheets(
      { version: 'v4', auth: googleOauth2Client.client },
    );

    const ranges = [];

    if (includeHeader) {
      // skip header line when empty snapshot
      snap.lastEmittedLine += snap.lastEmittedLine === 0 ? 1 : 0;
      // load headers according to dimension
      if (cfg.dimension === 'ROWS') {
        ranges.push(`${cfg.worksheetName}!A1:ZZZ1`);
        ranges.push(`${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:ZZZ${snap.lastEmittedLine + 1000}`);
      } else if (cfg.dimension === 'COLUMNS') {
        ranges.push(`${cfg.worksheetName}!A1:A18278`);
        ranges.push(
          `${cfg.worksheetName}!${columnToLetter(snap.lastEmittedLine + 1)}1:${columnToLetter(snap.lastEmittedLine + 1000)}${letterToColumn('ZZZ')}`,
        );
      }
      // when header disabled
    } else if (cfg.dimension === 'ROWS') {
      ranges.push(`${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:ZZZ${snap.lastEmittedLine + 1000}`);
    } else if (cfg.dimension === 'COLUMNS') {
      ranges.push(`${cfg.worksheetName}!${columnToLetter(snap.lastEmittedLine + 1)}1:${columnToLetter(
        snap.lastEmittedLine + 1000,
      )}${letterToColumn('ZZZ')}`);
    }

    const requestParams = {
      spreadsheetId: cfg.spreadsheetId,
      ranges,
      majorDimension: cfg.dimension,
    };

    debug('Google API request parameters: %j', requestParams);

    const responseRange = await sheets.spreadsheets.values.batchGet(requestParams);

    debug('Google API response: %j', responseRange.data);

    const mergedArray = responseRange.data.valueRanges.reduce(
      (accumulator, currentValue) => {
        if (currentValue.values) {
          accumulator.push(...currentValue.values);
        }
        return accumulator;
      }, [],
    );

    debug('Merged array: %j', mergedArray);

    if (mergedArray.length > includeHeader ? 1 : 0) {
      const result = transformToOutputStructure(cfg.dimension, mergedArray,
        includeHeader);

      debug('Transformed data: %j', result);

      result.forEach(
        item => this.emit('data', messages.newMessageWithBody(item)),
      );
      snap.lastEmittedLine += result.length;
    }
    snap.modifiedTime = newModifiedTime;
    this.emit('snapshot', snap);
    debug('Emitted snapshot: %j', snap);
  }
}

async function listSpreadsheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfSpreadsheets();
  debug(result);
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  debug(result);
  return result;
}

module.exports.process = processTrigger;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
