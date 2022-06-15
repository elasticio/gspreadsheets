const { GoogleOauth2Client } = require('./lib/client');

async function verify(credentials) {
  this.logger.info('Start to verify credentials, config: %j', credentials);

  const googleOauth2Client = new GoogleOauth2Client(credentials, this);
  try {
    const result = await googleOauth2Client.listOfSpreadsheets();
    this.logger.info('Credentials was successfully verified, result %j', result);
  } catch (e) {
    this.logger.error('Credentials verification failed');
    throw e;
  }
}

module.exports = verify;
