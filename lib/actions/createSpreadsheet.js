const { messages } = require('elasticio-node');
const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');


async function processAction(msg, cfg) {
  this.logger.info('Incoming configuration: %j', cfg);
  this.logger.info('Incoming message: %j', msg);
  const quotaManager = new QuotaManager(cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  await oAuth2Client.buildClient();
  await quotaManager.rateLimit();
  const result = await oAuth2Client.createSpreadsheet(msg.body);
  return messages.newMessageWithBody(result.data);
}

module.exports.process = processAction;
