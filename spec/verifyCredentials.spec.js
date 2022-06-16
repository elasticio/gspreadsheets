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
  afterEach(() => {
    nock.cleanAll();
  });
  const configuration = {
    oauth: {
      type: 'OAuth2',
      oauth2: {
        keys: {
          access_token: 'access_token',
          expires_in: 3599,
          refresh_token: 'refresh_token',
          scope: 'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.metadata.readonly',
          additional_params: '{"access_type":"offline","prompt":"consent"}',
        },
      },
    },
  };
  beforeEach(() => {
    context = { logger, emit: sinon.spy() };
  });


  it(' successful update on mocked list Of Spreadsheets', async () => {
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
