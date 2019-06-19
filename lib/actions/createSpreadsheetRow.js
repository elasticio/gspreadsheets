const { google } = require('googleapis');
const { GoogleOauth2Client } = require('../client');

async function processAction(msg, cfg, snapshot) {
  console.log('Message: %j', msg);
  console.log('Configuration: %j', cfg);
  console.log('Snapshot: %j', snapshot);

  const oAuth2Client = new GoogleOauth2Client(cfg).client;
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.append({
      spreadsheetId: cfg.spreadsheetId,
      range: cfg.worksheetId,
      valueInputOption: 'RAW',
      resource: {
        majorDimension: 'ROWS',
        values: [msg.body.values]
      }
    }, (err, res) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        return reject(err);
      }
      return resolve(res.data);
    });
  });
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
  const idNameMap = await googleOauth2Client.listOfWorksheets(cfg.spreadsheetId);
  const result = {};
  Object.values(idNameMap).forEach(value => result[value] = value);
  console.log(result);
  return result;
}

module.exports.process = processAction;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
