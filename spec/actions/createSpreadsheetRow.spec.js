const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');

const createSpreadsheetRow = require('../../lib/actions/createSpreadsheetRow');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Add new row', function () {
  this.timeout(5000);
  let emitter;

  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      spreadsheetId: 'some_id',
      worksheetId: 'some_worksheet',
      oauth: {
        access_token: 'some_token',
        expiry_date: 5000000000000,
        refresh_token: 'some_refresh_token',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
        token_type: 'Bearer',
      },
    };
  });

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger: {
        trace: sinon.spy(),
        debug: sinon.spy(),
      }
    };
  });

  it('success', async () => {
    const msg = {
      body: {
        values: [1, -6.8, 'string_line', true],
      },
    };

    nock('https://sheets.googleapis.com')
      .persist()
      .post(
        `/v4/spreadsheets/${configuration.spreadsheetId}/values/${configuration.worksheetId}:append?valueInputOption=RAW`,
        { majorDimension: 'ROWS', values: [[1, -6.8, 'string_line', true]] },
      )
      .reply(200, { success: 'OK' });

    const result = await createSpreadsheetRow.process.call(emitter, msg, configuration);
    expect(result.body).to.deep.equal({ success: 'OK' });
  });

  it('list Worksheets', async () => {
    nock('https://sheets.googleapis.com')
      .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
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

    const result = await createSpreadsheetRow.listWorksheets(configuration);
    expect(result).to.deep.equal({ Sheet1: 'Sheet1', Sheet2: 'Sheet2' });
  });
});
