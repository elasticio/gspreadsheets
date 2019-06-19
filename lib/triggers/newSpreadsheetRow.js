/* eslint-disable max-len */

const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { transformToOutputStructure } = require('../common');


async function processTrigger(msg, cfg, snapshot) {
  this.logger.trace('Message: %j', msg);
  this.logger.trace('Configuration: %j', cfg);
  this.logger.trace('Snapshot: %j', snapshot);

  const googleOauth2Client = new GoogleOauth2Client(cfg);

  this.logger.info('Call Google Drive API for getting modifiedTime of spreadsheet %s', cfg.spreadsheetId);
  const drive = google.drive(
    { version: 'v3', auth: googleOauth2Client.client },
  );
  const sheet = await drive.files.get({
    fileId: cfg.spreadsheetId,
    fields: 'id,name,modifiedTime',
  });
  this.logger.trace('Got responce: %j', sheet);
  const snap = {
    modifiedTime: snapshot.modifiedTime || 0,
    lastEmittedLine: snapshot.lastEmittedLine || 0,
  };
  const newModidfiedTime = new Date(sheet.data.modifiedTime).getTime();
  this.logger.info('Snapshot modifiedTime: $s', snap.modifiedTime);
  this.logger.info('Actual modifiedTime: $s', newModidfiedTime);

  if (snap.modifiedTime < newModidfiedTime) {
    const sheets = google.sheets(
      { version: 'v4', auth: googleOauth2Client.client },
    );
    const range = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheetId,
      range: `${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:ZZZ${snap.lastEmittedLine + 1000}`,
      majorDimension: cfg.dimension,
    });

    this.logger.trace('Google API response: %j', range);

    if (range.data.values) {
      const includeHeader = cfg.includeHeader === 'yes';
      const result = transformToOutputStructure(cfg.dimension, range.data.values, includeHeader);
      result.forEach(item => this.emit('data', messages.newMessageWithBody(item)));
      snap.lastEmittedLine += range.data.values.length;
    }
    snap.modifiedTime = newModidfiedTime;
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
