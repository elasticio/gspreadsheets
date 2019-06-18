const { google } = require('googleapis');

class GoogleOauth2Client {
  constructor(configuration) {
    this.configuration = configuration;
    this.getToken();
    this.getCredentials();
    this.buildClient();
  }

  getToken() {
    const { oauth } = this.configuration;
    if (!this.token) {
      this.token = {
        access_token: oauth.access_token,
        refresh_token: oauth.refresh_token,
        expires_in: oauth.expires_in,
        scope: oauth.scope,
        token_type: oauth.token_type || 'Bearer',
      };
    }
    return this.token;
  }

  getCredentials() {
    if (!this.credentials) {
      this.credentials = {
        client_id: process.env.GOOGLE_APP_ID,
        client_secret: process.env.GOOGLE_APP_SECRET,
        redirect_uri: `https://${process.env.TENANT_DOMAIN
        || 'app.elastic.io'}/callback/oauth2`,
      };
    }
    return this.credentials;
  }

  buildClient() {
    // eslint-disable-next-line camelcase
    const { client_secret, client_id, redirect_uri } = this.credentials;
    this.client = new google.auth.OAuth2(client_id, client_secret,
      redirect_uri);
    this.client.setCredentials(this.token);
  }
}

module.exports.GoogleOauth2Client = GoogleOauth2Client;
