const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');

async function processAction(msg, cfg, snapshot) {
  this.logger.trace('Message: %j', msg);
  this.logger.trace('Configuration: %j', cfg);
  this.logger.trace('Snapshot: %j', snapshot);

  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const googleClient =  oAuth2Client.client;
  const sheets = google.sheets({ version: 'v4', auth: googleClient });

  const result = await sheets.spreadsheets.values.append({
    spreadsheetId: cfg.spreadsheetId,
    range: cfg.worksheetId,
    valueInputOption: 'RAW',
    resource: {
      majorDimension: 'ROWS',
      values: [msg.body.values],
    },
  });

  return messages.newMessageWithBody(result.data);
}

async function listSpreadsheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfSpreadsheets();
  this.logger.trace(result);
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  this.logger.trace(result);
  return result;
}

module.exports.process = processAction;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
