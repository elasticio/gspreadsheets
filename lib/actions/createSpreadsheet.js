const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');

async function processAction(msg, cfg, snapshot) {
  console.log('Message: %j', msg);
  console.log('Configuration: %j', cfg);
  console.log('Snapshot: %j', snapshot);

  const oAuth2Client = new GoogleOauth2Client(cfg).client;
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

  const result = await sheets.spreadsheets.create({
    resource:  msg.body
  });

  return messages.newMessageWithBody(result.data);
}

module.exports.process = processAction;
