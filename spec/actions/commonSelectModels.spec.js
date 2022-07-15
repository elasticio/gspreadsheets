/* eslint-disable no-unused-expressions */
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');

const log = require('@elastic.io/component-logger')();

const commonSelectModels = require('../../lib/commonSelectModels');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('commonSelectModels test', () => {
  let emitter;
  const spreadsheetId = '1hmlsXhpNf0AVFlVEegsugxeWQZoZicBlFMqAjomVexs';
  let configuration;
  process.env.ELASTICIO_API_URI = 'https://app.example.io';
  process.env.ELASTICIO_API_USERNAME = 'user';
  process.env.ELASTICIO_API_KEY = 'apiKey';
  process.env.ELASTICIO_WORKSPACE_ID = 'workspaceId';
  const secret = {
    data: {
      attributes: {
        credentials: {
          access_token: 'access_token',
          refresh_token: 'refresh_token',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.metadata.readonly',
          additional_params: '{"access_type":"offline","prompt":"consent"}',
        },
      },
    },
  };
  const secretId = '62aad9dbdd84a800122493f9';
  afterEach(() => {
    nock.cleanAll();
  });
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      spreadsheetId,
      mode: 'array',
      secretId,
    };
  });

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger: log,
    };
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
  });

  it('listSpreadsheets', async () => {
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
    const result = await commonSelectModels.listSpreadsheets.call(emitter, configuration);
    expect(result).to.deep.equal({
      1: 'Sheet1',
      2: 'Sheet2',
    });
  });

  it('listWorksheets', async () => {
    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${spreadsheetId}`)
      .reply(200, {
        sheets: [
          {
            properties: {
              sheetId: 387964220,
              title: 'Sheet A',
              index: 0,
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26,
              },
            },
          },
          {
            properties: {
              sheetId: 1462989167,
              title: 'Sheet B',
              index: 1,
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26,
              },
            },
          },
        ],
      });
    const result = await commonSelectModels.listWorksheets.call(emitter, configuration);
    expect(result).to.deep.equal({
      387964220: 'Sheet A',
      1462989167: 'Sheet B',
    });
  });
});
