const logger = require('@elastic.io/component-logger')();
const { GoogleOauth2Client } = require('./lib/client');


async function verify(credentials) {
  const googleOauth2Client = new GoogleOauth2Client(credentials);
  try {
    googleOauth2Client.listOfSpreadsheets();
    logger.info('Credentials was successfully verified');
  } catch (e) {
    logger.error('Error while request to Google API: o%', e);
    throw e;
  }
}

module.exports = verify;
