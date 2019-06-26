const { GoogleOauth2Client } = require('./lib/client');
const debug = require('debug')('Credentials');

async function verify(credentials) {
  const googleOauth2Client = new GoogleOauth2Client(credentials, this);
  try {
    await googleOauth2Client.listOfSpreadsheets();
    debug('Credentials was successfully verified');
  } catch (e) {
    debug('Error while request to Google API: %o', e);
    throw e;
  }
}

module.exports = verify;
