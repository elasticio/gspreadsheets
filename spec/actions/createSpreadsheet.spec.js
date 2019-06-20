const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');

const createSpreadsheet = require('../../lib/actions/createSpreadsheet');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Add new spreadsheet', function() {
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

  it('success', async () => {
    nock('https://sheets.googleapis.com')
      .post('/v4/spreadsheets')
      .reply(200, { status: 'OK' });

    const msg = {
      body: {
        properties: { title: 'Some name' },
        sheets: [
          { properties: { title: 'Sheet A', }, },
          { properties: { title: 'Sheet B', }, },
        ],
      },
    };

    const result = await createSpreadsheet.process(msg, configuration);

    expect(result.body).to.deep.equal({ status: 'OK' });
  });
});
