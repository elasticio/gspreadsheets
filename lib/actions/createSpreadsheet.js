const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');

async function processAction(msg, cfg, snapshot) {
  this.logger.trace('Message: %j', msg);
  this.logger.trace('Configuration: %j', cfg);
  this.logger.trace('Snapshot: %j', snapshot);

  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const googleClient = oAuth2Client.client;
  const sheets = google.sheets({ version: 'v4', auth: googleClient });

  const result = await sheets.spreadsheets.create({
    resource: msg.body,
  });

  return messages.newMessageWithBody(result.data);
}

module.exports.process = processAction;
