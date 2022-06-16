const retry = require('async-retry');
const { google } = require('googleapis');
const utils = require('../lib/helpers/utils');
const { getRetriesFromConfig } = require('./common');

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
    const { secretId } = this.configuration;
    if (!secret) {
      if (!secretId) {
        secret = {
          credentials: this.configuration.oauth.oauth2.keys,
        };
      } else {
        this.logger.info('Going to load the new secret...');
        secret = await utils.getSecret(this, secretId);
      }
    } else {
      this.logger.info('Secret cached: %j', secret);
    }
    const { credentials } = secret;
    this.logger.info('Secret credentials: %j', credentials);
    token = {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expires_in: credentials.expires_in,
      scope: credentials.scope,
      token_type: credentials.token_type || 'Bearer',
    };
    return token;
  }

  async buildClient() {
    this.logger.info(`Starting to build client, secret: ${JSON.stringify(secret)}`);
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

  async createSpreadsheet(resource) {
    const retries = getRetriesFromConfig(this.configuration);

    try {
      return await retry(async () => {
        this.logger.debug('Trying to create a spreadsheet...');
        try {
          const sheets = google.sheets({ version: 'v4', auth: this.client });
          const result = await sheets.spreadsheets.create({
            resource,
          });
          this.logger.debug('Spreadsheet created successfully');
          return result;
        } catch (e) {
          this.logger.info('Error occurred %j', e);
          if (e.code && e.code === '401') {
            secret = null;
            await this.buildClient();
          }
          throw e;
        }
      },
      {
        retries,
      });
    } catch (err) {
      throw new Error(`Could not create to a spreadsheet. Error: ${err.message}`);
    }
  }

  async getSpreadsheet() {
    const {
      spreadsheetId,
      worksheetId,
    } = this.configuration;
    const sheets = google.sheets({ version: 'v4', auth: this.client });
    const retries = getRetriesFromConfig(this.configuration);
    try {
      return await retry(async () => {
        this.logger.debug('Trying to get spreadsheet rows...');
        try {
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: worksheetId,
          });
          this.logger.debug('Spreadsheet rows retrieved successfully');
          return res;
        } catch (e) {
          this.logger.info('Error occurred %j', e);
          if (e.code && e.code === '401') {
            secret = null;
            await this.buildClient();
          }
          throw e;
        }
      },
      {
        retries,
      });
    } catch (err) {
      throw new Error(`Could not read rows from a spreadsheet. Error: ${err.message}`);
    }
  }

  async writeToSpreadsheet(values) {
    const {
      spreadsheetId,
      worksheetId,
    } = this.configuration;
    const retries = getRetriesFromConfig(this.configuration);
    try {
      return await retry(async () => {
        this.logger.debug('Trying to write a row to spreadsheet...');
        try {
          const sheets = google.sheets({ version: 'v4', auth: this.client });
          const res = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: worksheetId,
            valueInputOption: 'RAW',
            resource: {
              majorDimension: 'ROWS',
              values: [values],
            },
          });
          this.logger.debug('Spreadsheet row was written successfully');
          return res;
        } catch (e) {
          this.logger.info('Error occurred %j', e);
          if (e.code && e.code === '401') {
            secret = null;
            await this.buildClient();
          }
          throw e;
        }
      },
      {
        retries,
      });
    } catch (err) {
      throw new Error(`Could not write a row to a spreadsheet. Error: ${err.message}`);
    }
  }
}

module.exports.GoogleOauth2Client = GoogleOauth2Client;
