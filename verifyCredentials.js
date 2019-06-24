const { GoogleOauth2Client } = require('./lib/client');


async function verify(credentials) {
  const googleOauth2Client = new GoogleOauth2Client(credentials);
  try {
    googleOauth2Client.listOfSpreadsheets();
    console.log('Credentials was successfully verified');
  } catch (e) {
    console.log('Error while request to Google API: o%', e);
    throw e;
  }
}

module.exports = verify;
