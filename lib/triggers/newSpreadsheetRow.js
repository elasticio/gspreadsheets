const { google } = require('googleapis');
const { GoogleOauth2Client } = require('../client');


async function create(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
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
  const oAuth2Client = new GoogleOauth2Client(cfg).client;
  const drive = google.drive({ version: 'v3', oAuth2Client });
  const sheets = await drive.files.list({
    q: 'mimeType=\'application/vnd.google-apps.spreadsheet\'',
    fields: 'nextPageToken, files(id, name)',
  });
  console.log(JSON.stringify(sheets));
  return { 1: '2' };
}

module.exports.process = processTrigger;
module.exports.listSpreadsheets = listSpreadsheets;
