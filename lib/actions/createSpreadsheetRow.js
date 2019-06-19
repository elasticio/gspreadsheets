const { google } = require('googleapis');
const { GoogleOauth2Client } = require('../client');

async function processAction(msg, cfg, snapshot) {
  console.log('Message: %j', msg);
  console.log('Configuration: %j', cfg);
  console.log('Snapshot: %j', snapshot);

  const oAuth2Client = new GoogleOauth2Client(cfg).client;
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
  const response = await new Promise((resolve, reject) => {
    sheets.spreadsheets.values.append({
      spreadsheetId: '1f6o4Xun9VLaYqHCnTJ6b_cFlmT0xO7Lp85Fg73GBCLk',
      range: 'Sheet1',
      valueInputOption: 'RAW',
      resource: {
        majorDimension: 'ROWS',
        values: [[1.2, -2, 'somwthing', true]]
      }
    }, (err, res) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        return reject(err);
      }
      resolve(res.data);
    });
  });

  return response;
}

module.exports.process = processAction;
