const { google } = require('googleapis');
const utils = require('../lib/helpers/utils');

let token;
let secret;

class GoogleOauth2Client {
  constructor(configuration, context) {
    if (!context || !context.logger || !context.emit) {
      throw new Error('Can not find a valid context.');
    }
    this.configuration = configuration;
    this.context = context;
    this.logger = context.logger;
  }

  async getToken() {
    if (!token) {
      const { secretId } = this.configuration;
      if (!secret) {
        this.logger.info('Going to load the new secret...');
        secret = await utils.getSecret(this, secretId);
      }
      const { credentials } = secret;
      token = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_in: credentials.expires_in,
        scope: credentials.scope,
        token_type: credentials.token_type || 'Bearer',
      };
    }
    return token;
  }

  async buildClient() {
    // it is used stub value for clientSecret, clientId, refresh token task is on Faceless side
    const clientSecret = 'clientSecret';
    const clientId = 'clientId';
    const redirectUri = process.env.TEST_REDIRECT_URL
      || `https://${process.env.TENANT_DOMAIN
      || 'app.elastic.io'}/callback/oauth2`;
    this.client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    await this.getToken();
    this.client.setCredentials(token);

    this.client.on('tokens', async () => {
      this.context.logger.info('Token is outdated. Reload token from secret...');
      secret = null;
      token = null;
      await this.getToken();
      this.context.logger.info('New token was reloaded...');
    });
  }

  async listOfSpreadsheets() {
    if (!this.client) {
      await this.buildClient();
    }
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
    if (!this.client) {
      await this.buildClient();
    }
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
