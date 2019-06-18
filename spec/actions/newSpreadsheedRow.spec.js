const fs = require('fs');
const chai = require('chai');

const {listSpreadsheets} = require('../../lib/triggers/newSpreadsheetRow');

describe('listSpreadsheets', () => {
  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      oauth: {
        access_token: process.env.ACCESS_TOKEN,
        expires_in: 3600,
        refresh_token: process.env.REFRESH_TOKEN,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly',
        token_type: 'Bearer',
      },
    };
  });

  it('check list of sheets', async () => {
    await listSpreadsheets(configuration);
  });
});
