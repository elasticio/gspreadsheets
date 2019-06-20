const { google } = require('googleapis');

class GoogleOauth2Client {
  constructor(configuration, emitter) {
    this.configuration = configuration;
    this.emitter = emitter;

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
        expiry_date: oauth.expiry_date || new Date().getTime + oauth.expires_in,
      };
    }
    return this.token;
  }

  getCredentials() {
    if (!this.credentials) {
      this.credentials = {
        client_id: process.env.GOOGLE_APP_ID,
        client_secret: process.env.GOOGLE_APP_SECRET,
        redirect_uri: process.env.TEST_REDIRECT_URL
          || `https://${process.env.TENANT_DOMAIN
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

  async checkAndUpdateCredentials(newCredentials) {
    if (newCredentials.expiry_date > this.credentials.expiry_date) {
      this.credentials = newCredentials;
      await this.emitter.emit('updateKeys', { oauth: this.credentials });
      return true;
    }
    return false;
  }

  async listOfSpreadsheets() {
    const drive = google.drive({ version: 'v3', auth: this.client });
    const sheets = await drive.files.list({
      q: 'mimeType=\'application/vnd.google-apps.spreadsheet\'',
      fields: 'nextPageToken, files(id, name)',
    });
    return sheets.data.files
      .map(item => ({ [item.id]: item.name }))
      .reduce((accumulator, currentValue) => {
        const key = Object.keys(currentValue)[0];
        accumulator[key] = currentValue[key];
        return accumulator;
      }, {});
  }

  async listOfWorksheets(spreadsheetId) {
    const sheets = google.sheets({ version: 'v4', auth: this.client });
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      auth: this.client,
    });
    const worksheets = response.data.sheets
      .map(
        item => ({ [item.properties.sheetId]: item.properties.title }),
      )
      .reduce((accumulator, currentValue) => {
        const key = Object.keys(currentValue)[0];
        accumulator[currentValue[key]] = currentValue[key];
        return accumulator;
      }, {});
    return worksheets;
  }
}

module.exports.GoogleOauth2Client = GoogleOauth2Client;
