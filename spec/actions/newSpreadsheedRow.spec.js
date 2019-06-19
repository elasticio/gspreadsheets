const fs = require('fs');

const { listSpreadsheets, listWorksheets } = require('../../lib/triggers/newSpreadsheetRow');

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
        scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
        token_type: 'Bearer',
        expiry_date: 1560935119429,
      },
      spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
    };
  });

  it('check list of spreadsheets', async () => {
    await listSpreadsheets(configuration);
  });


  it('check list of worksheets', async () => {
    await listWorksheets(configuration);
  });
});
