const fs = require('fs');
const chai = require('chai');

const createSpreadsheetRow = require('../../lib/actions/createSpreadsheetRow');

describe('Add new row', function() {
  this.timeout(20000);

  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      oauth: {
        access_token: process.env.ACCESS_TOKEN,
        expiry_date: 1560935120410,
        refresh_token: process.env.REFRESH_TOKEN,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
        token_type: 'Bearer',
      },
    };
  });

  it('success', async () => {
    await createSpreadsheetRow.process({}, configuration);
    console.log('DONE!')
  });
});
