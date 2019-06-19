const {google} = require('googleapis');
const {GoogleOauth2Client} = require('../client');

async function create(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  const created = await sheets.spreadsheets.create({
    resource: {
      properties: {
        title: 'Node JS generate J-sheet',
      },
    },
  });
  console.log(JSON.stringify(created));
}

async function processTrigger(msg, cfg, snapshot) {
  console.log('Message: %j', msg);
  console.log('Configuration: %j', cfg);
  console.log('Snapshot: %j', snapshot);

  // const oAuth2Client = new GoogleOauth2Client(cfg).client;
}

async function listSpreadsheets(cfg) {
  console.log('Configuration: %j', cfg);
  const googleOauth2Client = new GoogleOauth2Client(cfg);
  const result = await googleOauth2Client.listOfSpreadsheets();
  console.log(result)
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
