/* eslint-disable no-await-in-loop */
const { google } = require('googleapis');
const utils = require('../lib/helpers/utils');
const { getRetriesFromConfig } = require('./common');

let token;
let secret;
const driveVersion = 'v3';
const sheetsVersion = 'v4';

class GoogleOauth2Client {
  constructor(configuration, context) {
    if (!context || !context.logger || !context.emit) {
      throw new Error('Can not find a valid context.');
    }
    this.configuration = configuration;
    this.logger = context.logger;
  }

  // eslint-disable-next-line class-methods-use-this
  resetSecret() {
    secret = null;
  }

  async getToken() {
    const { secretId } = this.configuration;
    if (!secret) {
      if (!secretId) {
        if (this.configuration.oauth?.oauth2?.keys) {
          secret = {
            credentials: this.configuration.oauth.oauth2.keys,
          };
        } else {
          this.logger.error('Credentials should contain secretId or object with oauth2 keys');
          throw new Error('Credentials should contain secretId or object with oauth2 keys');
        }
      } else {
        secret = await utils.getSecret(this, secretId);
      }
    } else {
      this.logger.info('Cached Secret found');
    }
    const { credentials } = secret;
    this.logger.trace('Found secret: %j', secret);
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
    this.logger.info('Starting to build client...');
    this.logger.trace(`Starting to build client, found secret: ${JSON.stringify(secret)} and token ${JSON.stringify(token)}`);
    await this.getToken();
    this.client = new google.auth.OAuth2('clientId', 'clientSecret', 'https://app.elastic.io/callback/oauth2');
    this.client.setCredentials(token);
  }

  async callFunction(gsFunction, opts) {
    if (!this.client) {
      await this.buildClient();
    }
    const retries = getRetriesFromConfig(this.configuration);
    let currentToken = token;
    let result;
    for (let iteration = 0; iteration <= retries; iteration++) {
      this.logger.debug('Trying to run a spreadsheet function...');
      try {
        result = await gsFunction.call(this, opts);
        this.logger.info('Google spreadsheet function is successfully executed');
        break;
      } catch (e) {
        this.logger.error('Error occurred during execution spreadsheet function: %j', e.message);
        if (e.code && ['401', '403'].includes(e.code)) {
          this.resetSecret();
          await this.buildClient();
          if (currentToken.access_token !== token.access_token) {
            this.logger.debug('Secret has been reloaded, trying to use the new token...');
            currentToken = token;
          } else {
            try {
              this.logger.info('Session is expired, trying to refresh token forcibly...');
              await utils.refreshToken(this, this.configuration.secretId);
              this.resetSecret();
              await this.buildClient();
            } catch (err) {
              this.logger.error('Failed to refresh token');
              throw err;
            }
          }
          if (iteration < retries) {
            await utils.sleep();
          }
        } else if (e?.code < 500) {
          this.logger.error('Error: %s was received', e.message);
          throw e;
        } else if (iteration < retries) {
          await utils.sleep();
        } else {
          throw e;
        }
      }
    }
    if (!result) {
      this.logger.error('The result was not received, access_token is invalid, and retries to refresh it is exceeded');
      throw new Error('The result was not received, access_token is invalid, and retries to refresh it is exceeded');
    }
    return result;
  }

  async listOfSpreadsheets() {
    this.logger.debug('Trying to list spreadsheets...');
    const drive = google.drive({ version: driveVersion, auth: this.client });
    const sheets = await drive.files.list({
      q: 'mimeType=\'application/vnd.google-apps.spreadsheet\'',
      fields: 'nextPageToken, files(id, name)',
    });
    const result = sheets.data.files
      .map(item => ({ [item.id]: item.name }))
      .reduce((accumulator, currentValue) => {
        const key = Object.keys(currentValue)[0];
        accumulator[key] = currentValue[key];
        return accumulator;
      }, {});
    this.logger.debug('Spreadsheets listed successfully');
    return result;
  }

  async listOfWorksheets(spreadsheetId) {
    this.logger.debug('Starting to list worksheets');
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
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
    this.logger.debug('Worksheets listed successfully');
    return worksheets;
  }

  async createSpreadsheet(resource) {
    this.logger.debug('Trying to create spreadsheet...');
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
    const result = await sheets.spreadsheets.create({
      resource,
    });
    this.logger.debug('Spreadsheet created successfully');
    return result;
  }

  async getSpreadsheet() {
    this.logger.debug('Trying to get spreadsheet...');
    const { spreadsheetId, worksheetId } = this.configuration;
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: worksheetId,
    });
    this.logger.debug('Spreadsheet retrieved successfully');
    return result;
  }

  async writeToSpreadsheet(values) {
    this.logger.debug('Trying to write a row to spreadsheet...');
    const { spreadsheetId, worksheetId } = this.configuration;
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: worksheetId,
      valueInputOption: 'RAW',
      resource: {
        majorDimension: 'ROWS',
        values: [values],
      },
    });
    this.logger.debug('Spreadsheet row was written successfully');
    return result;
  }

  async updateSpreadsheetRow(opts) {
    this.logger.debug('Trying to write a row to spreadsheet...');
    const { spreadsheetId } = this.configuration;
    const { range, values } = opts;
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        majorDimension: 'ROWS',
        values: [values],
      },
    });
    this.logger.debug('Spreadsheet row was written successfully');
    return result;
  }

  async updateSpreadsheetColumn(opts) {
    this.logger.debug('Trying to write a column to spreadsheet...');
    const { spreadsheetId } = this.configuration;
    const { range, values } = opts;
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        majorDimension: 'COLUMNS',
        values: [values],
      },
    });
    this.logger.debug('Spreadsheet column was written successfully');
    return result;
  }

  async getDrive() {
    this.logger.debug('Trying to get a drive...');
    const driveClient = google.drive({ version: driveVersion, auth: this.client });
    const result = await driveClient.files.get({
      fileId: this.configuration.spreadsheetId,
      fields: 'id,name,modifiedTime',
    });
    this.logger.debug('Got a drive successfully');
    return result;
  }

  async batchGetRows(requestParams) {
    this.logger.debug('Trying to get a batch of rows from spreadsheet...');
    const sheets = google.sheets({ version: sheetsVersion, auth: this.client });
    const result = await sheets.spreadsheets.values.batchGet(requestParams);
    this.logger.debug('Got a batch of rows from spreadsheet successfully');
    return result;
  }
}

module.exports.GoogleOauth2Client = GoogleOauth2Client;
