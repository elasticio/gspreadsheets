const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const { GoogleOauth2Client } = require('../../lib/client');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Google client', function () {
  this.timeout(5000);

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

    const googleOauth2Client = new GoogleOauth2Client(configuration);
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

    const googleOauth2Client = new GoogleOauth2Client(configuration);
    const result = await googleOauth2Client.listOfWorksheets('some_spreadsheet');
    expect(result).to.deep.equal({ 1: 'Sheet1', 2: 'Sheet2' });
  });
});
