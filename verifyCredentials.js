const logger = require('@elastic.io/component-logger')();
const { GoogleOauth2Client } = require('./lib/client');

async function verify(credentials) {
  // for now sailor hasn't opportunity emit something from verify credentials context
  const context = {
    logger,
    emit: (emitType) => {
      logger.warn(`Can not call ${emitType} from verify credentials context.`);
    },
  };

  // eslint-disable-next-line no-use-before-define
  checkOauth2EnvarsPresence();

  const googleOauth2Client = new GoogleOauth2Client(credentials, context);
  try {
    await googleOauth2Client.listOfSpreadsheets();
    logger.info('Credentials was successfully verified');
  } catch (e) {
    logger.error('Error while request to Google API: %o', e);
    throw e;
  }
}

function checkOauth2EnvarsPresence() {
  if (!process.env.OAUTH_CLIENT_ID) {
    if (!process.env.OAUTH_CLIENT_SECRET) {
      throw new Error('Environment variables are missed: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET');
    }
    throw new Error('Environment variables are missed: OAUTH_CLIENT_ID');
  } else if (!process.env.OAUTH_CLIENT_SECRET) {
    throw new Error('Environment variables are missed: OAUTH_CLIENT_SECRET');
  }
}

module.exports = verify;
