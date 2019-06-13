/* eslint-disable no-use-before-define,consistent-return */
const { messages } = require('elasticio-node');
const {google} = require('googleapis');

exports.process = async function (msg, cfg) {
  const { client_secret, client_id, redirect_uris } = cfg;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(cfg.oauth2);
  create(oAuth2Client);
};

function create(auth) {
  const sheets = google.sheets({version: 'v4', auth}); //// Creating
  sheets.spreadsheets.create({
    resource: {
      properties: {
        title: 'Node JS generate J-sheet'
      }
    }
  }, function(err, response) {
    if (err) {
      console.error(err);
      return;
    }

    console.log(JSON.stringify(response, null, 2));
  });
}
