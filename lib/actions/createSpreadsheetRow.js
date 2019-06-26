const debug = require('debug')('CreateSpreadsheetRow');
const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');

async function processAction(msg, cfg, snapshot) {
  debug('Message: %j', msg);
  debug('Configuration: %j', cfg);
  debug('Snapshot: %j', snapshot);

  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const googleClient = oAuth2Client.client;
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
  const googleOauth2Client = new GoogleOauth2Client(cfg, this);
  const result = await googleOauth2Client.listOfSpreadsheets();
  debug(result);
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, this);
  const result = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  debug(result);
  return result;
}

module.exports.process = processAction;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
