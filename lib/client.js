const { google } = require('googleapis');

class GoogleOauth2Client {
  constructor(configuration, context) {
    if (!context || !context.logger || !context.emit) {
      throw new Error('Can not find a valid context.');
    }

    this.configuration = configuration;
    this.context = context;

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
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
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

    this.client.on('tokens', async (tokens) => {
      this.context.logger.info('Token is outdated. Updating token...');
      this.configuration.oauth.access_token = tokens.access_token;
      this.configuration.oauth.expiry_date = tokens.expiry_date;
      await this.context.emit('updateKeys', { oauth: this.configuration.oauth });
      this.context.logger.info('New Token was emitted successfully...');
    });
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
