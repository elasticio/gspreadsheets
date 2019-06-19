const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const createSpreadsheetRow = require('../../lib/actions/createSpreadsheetRow');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Add new row', function() {
  this.timeout(5000);

  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      spreadsheetId: '1f6o4Xun9VLaYqHCnTJ6b_cFlmT0xO7Lp85Fg73GBCLk',
      worksheetId: 'Sheet1',
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
    const msg = {
      body: {
        values: [1, -6.8, 'string_line', true]
      }
    };

    const result = await createSpreadsheetRow.process(msg, configuration);
    console.log(JSON.stringify(result));

    expect(result.spreadsheetId).to.equal(configuration.spreadsheetId);
    expect(result.updates.spreadsheetId).to.equal(configuration.spreadsheetId);
    expect(result.updates.updatedRows).to.equal(1);
    expect(result.updates.updatedColumns).to.equal(msg.body.values.length);
    expect(result.updates.updatedCells).to.equal(msg.body.values.length);
  });

  it('listWorksheets', async () => {
    const result = await createSpreadsheetRow.listWorksheets(configuration);
    expect(result).to.deep.equal({ Sheet1: 'Sheet1' });
  });
});
