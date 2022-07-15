/* eslint-disable max-len */
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const logger = require('@elastic.io/component-logger')();

const { GoogleOauth2Client } = require('../lib/client');

chai.use(chaiAsPromised);
const { expect } = chai;
let context;
const replyListSpreadseets = {
  files: [
    {
      id: 1,
      name: 'Sheet1',
    },
    {
      id: 2,
      name: 'Sheet2',
    },
  ],
};
const spreadsheetId = '1U6lUeRnBzyUiWNQwbNIG18oKLYbjTQddGe-W7AiT2tA';
const worksheetId = '23742873';
const worksheetName = 'Sheet A';
const listWorksheetsReply = {
  sheets: [
    {
      properties: {
        sheetId: worksheetId,
        title: worksheetName,
      },
    },
  ],
};

describe('Google client', () => {
  process.env.ELASTICIO_API_URI = 'https://app.example.io';
  process.env.ELASTICIO_API_USERNAME = 'user';
  process.env.ELASTICIO_API_KEY = 'apiKey';
  process.env.ELASTICIO_WORKSPACE_ID = 'workspaceId';
  const secret = {
    data: {
      attributes: {
        credentials: {
          access_token: 'accessToken',
        },
      },
    },
  };
  const cachedSecret = {
    data: {
      attributes: {
        credentials: {
          access_token: 'cachedAccessToken',
        },
      },
    },
  };
  const secretId = '62aad9dbdd84a800122493f9';
  afterEach(() => {
    nock.cleanAll();
  });
  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      secretId,
    };
  });

  beforeEach(() => {
    context = { logger, emit: sinon.spy() };
  });

  describe('Access token tests', () => {
    it('access_token valid', async () => {
      const secretNock = nock(process.env.ELASTICIO_API_URI)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, secret);
      const googleApisNock = nock('https://www.googleapis.com')
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(200, replyListSpreadseets);

      const googleOauth2Client = new GoogleOauth2Client(configuration, context);
      googleOauth2Client.resetSecret();
      const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfSpreadsheets);
      expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
      expect(secretNock.isDone()).to.equal(true);
      expect(googleApisNock.isDone()).to.equal(true);
    });

    it('access_token should be reloaded, 401 occurred', async () => {
      const secretNock = nock(process.env.ELASTICIO_API_URI)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, cachedSecret)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, secret);
      const googleApisNock = nock('https://www.googleapis.com')
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(401)
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(200, replyListSpreadseets);

      const googleOauth2Client = new GoogleOauth2Client(configuration, { ...context, retries: 0 });
      googleOauth2Client.resetSecret();
      const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfSpreadsheets);
      expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
      expect(secretNock.isDone()).to.equal(true);
      expect(googleApisNock.isDone()).to.equal(true);
    });

    it('access_token should be reloaded, 403 occurred', async () => {
      const secretNock = nock(process.env.ELASTICIO_API_URI)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, cachedSecret)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, secret);
      const googleApisNock = nock('https://www.googleapis.com')
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(403)
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(200, replyListSpreadseets);

      const googleOauth2Client = new GoogleOauth2Client(configuration, context);
      googleOauth2Client.resetSecret();
      const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfSpreadsheets);
      expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
      expect(secretNock.isDone()).to.equal(true);
      expect(googleApisNock.isDone()).to.equal(true);
    });

    it('access_token should be refreshed', async () => {
      const secretNock = nock(process.env.ELASTICIO_API_URI)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, cachedSecret)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, cachedSecret)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, secret);
      const secretRefreshNock = nock(process.env.ELASTICIO_API_URI)
        .post(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}/refresh`)
        .reply(200, secret);
      const googleApisNock = nock('https://www.googleapis.com')
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(403)
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(200, replyListSpreadseets);

      const googleOauth2Client = new GoogleOauth2Client(configuration, context);
      googleOauth2Client.resetSecret();
      const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfSpreadsheets);
      expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
      expect(secretNock.isDone()).to.equal(true);
      expect(secretRefreshNock.isDone()).to.equal(true);
      expect(googleApisNock.isDone()).to.equal(true);
    });
  });

  describe('Clients methods tests', () => {
    beforeEach(() => {
      nock(process.env.ELASTICIO_API_URI)
        .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
        .reply(200, secret);
    });
    it('list Of Spreadsheets', async () => {
      nock('https://www.googleapis.com')
        .get(
          '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
        )
        .reply(200, {
          files: [
            {
              id: 1,
              name: 'Sheet1',
            },
            {
              id: 2,
              name: 'Sheet2',
            },
          ],
        });

      const googleOauth2Client = new GoogleOauth2Client(configuration, context);
      const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfSpreadsheets);
      expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
    });

    it('list Of worksheets', async () => {
      nock('https://sheets.googleapis.com')
        .get(`/v4/spreadsheets/${spreadsheetId}`)
        .reply(200, {
          sheets: [
            {
              properties: {
                sheetId: 1,
                title: 'Sheet1',
              },
            },
            {
              properties: {
                sheetId: 2,
                title: 'Sheet2',
              },
            },
          ],
        });

      const googleOauth2Client = new GoogleOauth2Client(configuration, context);
      const result = await googleOauth2Client.callFunction(googleOauth2Client.listOfWorksheets, spreadsheetId);
      expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
    });

    it('createSpreadsheets', async () => {
      const spreadsheetData = {
        properties: { title: 'Some name' },
        sheets: [
          { properties: { title: 'Sheet A' } },
          { properties: { title: 'Sheet B' } },
        ],
      };
      nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
        .post('/v4/spreadsheets', spreadsheetData)
        .reply(200, ['done'], []);
      const client = new GoogleOauth2Client(configuration, context);
      const result = await client.callFunction(client.createSpreadsheet, spreadsheetData);
      expect(result.data).to.deep.equal(['done']);
    });

    it('getSpreadsheet', async () => {
      const listWorksheets = nock('https://sheets.googleapis.com')
        .get(`/v4/spreadsheets/${spreadsheetId}`)
        .reply(200, listWorksheetsReply);
      nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
        .get(`/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(worksheetName)}`)
        .reply(200, ['done'], []);
      const client = new GoogleOauth2Client({ ...configuration, worksheetId, spreadsheetId }, context);
      const result = await client.callFunction(client.getSpreadsheet);
      expect(result.data).to.deep.equal(['done']);
      expect(listWorksheets.isDone()).to.be.equal(true);
    });

    it('writeToSpreadsheet', async () => {
      const values = [1, -6.8, 'string_line', true];
      const listWorksheets = nock('https://sheets.googleapis.com')
        .get(`/v4/spreadsheets/${spreadsheetId}`)
        .reply(200, listWorksheetsReply);
      nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
        .post(`/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(worksheetName)}:append`, { majorDimension: 'ROWS', values: [values] })
        .query({ valueInputOption: 'RAW' })
        .reply(200, ['done'], []);
      const client = new GoogleOauth2Client({ ...configuration, worksheetId, spreadsheetId }, context);
      const result = await client.callFunction(client.writeToSpreadsheet, { values });
      expect(result.data).to.deep.equal(['done']);
      expect(listWorksheets.isDone()).to.be.equal(true);
    });

    it('getDrive', async () => {
      nock('https://www.googleapis.com:443', { encodedQueryParams: true })
        .get(`/drive/v3/files/${spreadsheetId}`)
        .query({ fields: 'id%2Cname%2CmodifiedTime' })
        .reply(200, ['done'], []);
      const client = new GoogleOauth2Client({ ...configuration, worksheetId, spreadsheetId }, context);
      const result = await client.callFunction(client.getDrive);
      expect(result.data).to.deep.equal(['done']);
    });

    it('batchGetRows', async () => {
      const params = {
        spreadsheetId,
        ranges: ['Sheet A!L1:ALW5000'],
        majorDimension: 'COLUMNS',
        valueRenderOption: 'UNFORMATTED_VALUE',
      };
      nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
        .get('/v4/spreadsheets/1U6lUeRnBzyUiWNQwbNIG18oKLYbjTQddGe-W7AiT2tA/values:batchGet')
        .query({ ranges: 'Sheet%20A%21L1%3AALW5000', majorDimension: 'COLUMNS', valueRenderOption: 'UNFORMATTED_VALUE' })
        .reply(200, ['done']);
      const client = new GoogleOauth2Client({ ...configuration, worksheetId, spreadsheetId }, context);
      const result = await client.callFunction(client.batchGetRows, params);
      expect(result.data).to.deep.equal(['done']);
    });
  });
});
