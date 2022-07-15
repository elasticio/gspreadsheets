const { GoogleOauth2Client } = require('../lib/client');

async function listSpreadsheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, this);
  const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfSpreadsheets);
  this.logger.debug('Got list of spreadsheets');
  return result;
}

async function listWorksheets(cfg) {
  const googleOauth2Client = new GoogleOauth2Client(cfg, this);
  // eslint-disable-next-line max-len
  const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfWorksheets, cfg.spreadsheetId);
  this.logger.debug('Got list of worksheets');
  return result;
}

exports.listSpreadsheets = listSpreadsheets;
exports.listWorksheets = listWorksheets;
