const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const logger = require('@elastic.io/component-logger')();
const nock = require('nock');

const sinon = require('sinon');
const verify = require('../verifyCredentials');

chai.use(chaiAsPromised);
const { expect } = chai;
let context;

describe('Verify Credentials', () => {
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
  const configuration = {
    secretId,
  };
  beforeEach(() => {
    context = { logger, emit: sinon.spy() };
  });


  it(' successful update on mocked list Of Spreadsheets', async () => {
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
    nock(process.env.ELASTICIO_API_URI)
      .post(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}/refresh`)
      .reply(200, secret);
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

    const result = await verify.call(context, configuration);
    expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
  });
});
