/* eslint-disable max-len */

const { google } = require('googleapis');
const { GoogleOauth2Client } = require('../client');
const { transformToOutputStructure } = require('../common');

async function processTrigger(msg, cfg, snapshot) {
  console.log('Message: %j', msg);
  console.log('Configuration: %j', cfg);
  console.log('Snapshot: %j', snapshot);

  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const drive = google.drive(
    { version: 'v3', auth: googleOauth2Client.client },
  );
  const sheet = await drive.files.get({
    fileId: cfg.spreadsheetId,
    fields: 'id,name,modifiedTime',
  });

  const snap = {
    modifiedTime: snapshot.modifiedTime || 0,
    lastEmittedLine: snapshot.lastEmittedLine || 0,
  };
  const newModidfiedTime = new Date(sheet.data.modifiedTime).getTime();

  if (snap.modifiedTime < newModidfiedTime) {
    const sheets = google.sheets(
      { version: 'v4', auth: googleOauth2Client.client },
    );
    const range = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheetId,
      range: `${cfg.worksheetName}!A${snap.lastEmittedLine + 1}:ZZZ${snap.lastEmittedLine + 1000}`,
      majorDimension: cfg.dimension,
    });
    if (range.data.values) {
      const includeHeader = cfg.includeHeader === 'Yes';
      const result = transformToOutputStructure(cfg.dimension, range.data.values, includeHeader);
      result.forEach(item => this.emit('data', item));
      snap.lastEmittedLine += range.data.values.length;
    }
    snap.modifiedTime = newModidfiedTime;
    this.emit('snapshot', snap);
  }
  this.emit('end');
}

async function listSpreadsheets(cfg) {
  console.log('Configuration: %j', cfg);
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfSpreadsheets();
  console.log(result);
  return result;
}

async function listWorksheets(cfg) {
  console.log('Configuration: %j', cfg);
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  console.log(result);
  return result;
}

module.exports.process = processTrigger;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
