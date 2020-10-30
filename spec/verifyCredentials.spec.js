const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const verify = require('../verifyCredentials');

chai.use(chaiAsPromised);

describe('Verify Credentials', () => {
  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      oauth: {
        access_token: 'some_token',
        expiry_date: 5000000000000,
        refresh_token: 'some_refresh_token',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
        token_type: 'Bearer',
      },
    };
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

    await verify(configuration);
  });
});
