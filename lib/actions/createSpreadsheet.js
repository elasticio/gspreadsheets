const { google } = require('googleapis');
const { messages } = require('elasticio-node');
const retry = require('async-retry');
const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { getRetriesFromConfig } = require('../common');


async function processAction(msg, cfg) {
  this.logger.info('Incoming configuration: %j', cfg);
  this.logger.info('Incoming message: %j', msg);
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  await oAuth2Client.buildClient();
  const googleClient = oAuth2Client.client;
  const sheetsClient = google.sheets({ version: 'v4', auth: googleClient });
  await quotaManager.rateLimit();
  // eslint-disable-next-line no-use-before-define
  const result = await createSpreadsheet.call(this, sheetsClient, cfg, msg.body);
  return messages.newMessageWithBody(result.data);
}

async function createSpreadsheet(sheetsClient, cfg, resource) {
  const retries = getRetriesFromConfig(cfg);
  try {
    return await retry(async () => {
      this.logger.debug('Trying to create a spreadsheet...');
      const result = await sheetsClient.spreadsheets.create({
        resource,
      });
      this.logger.debug('Spreadsheet created successfully');
      return result;
    },
    {
      retries,
    });
  } catch (err) {
    throw new Error(`Could not create to a spreadsheet. Error: ${err.message}`);
  }
}

module.exports.process = processAction;
