const { google } = require('googleapis');
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');

const quotaManager = new QuotaManager();

// eslint-disable-next-line no-unused-vars
async function processAction(msg, cfg, snapshot) {
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const googleClient = oAuth2Client.client;
  const sheets = google.sheets({ version: 'v4', auth: googleClient });

  await quotaManager.rateLimit();

  const result = await sheets.spreadsheets.create({
    resource: msg.body,
  });

  return messages.newMessageWithBody(result.data);
}

module.exports.process = processAction;
