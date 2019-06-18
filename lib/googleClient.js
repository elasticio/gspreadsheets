const {google} = require('googleapis');

const oAuthUtils = require('./oauth-utils');

exports.getAuthorizedgoogleClient = async function (cfg, emitter) {
    const client_id = process.env.GOOGLE_APP_ID;
    const client_secret = process.env.GOOGLE_APP_SECRET;
    const redirect_uri = process.env.GOOGLE_REDIRECT_URI;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uri);

    if (!cfg.oauth) {
        cfg.oauth = oAuthUtils.refreshTokenPromise(client_id, cfg);
        emitter.emit('updateKeys', { oauth: cfg.oauth });
        console.log('Refreshed token, received new keys');
    }

    await oAuth2Client.setCredentials(cfg.oauth);

    return oAuth2Client;
};