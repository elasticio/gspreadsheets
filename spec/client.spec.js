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
  const secretId = 'secretId';
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
    const result = await googleOauth2Client.listOfSpreadsheets();
    expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
  });

  it('list Of worksheets', async () => {
    nock('https://sheets.googleapis.com')
      .get('/v4/spreadsheets/some_spreadsheet')
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
    const result = await googleOauth2Client.listOfWorksheets('some_spreadsheet');
    expect(result).to.deep.equal({ Sheet1: 'Sheet1', Sheet2: 'Sheet2' });
  });
});
