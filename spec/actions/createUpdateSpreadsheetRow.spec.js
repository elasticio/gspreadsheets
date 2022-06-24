/* eslint-disable no-unused-expressions */
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const log = require('@elastic.io/component-logger')();

const nock = require('nock');
const upsertSpreadsheetRow = require('../../lib/actions/upsertSpreadsheetRow');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('create/update/upsert row/column process', async () => {
  let emitter;
  let configuration;
  let secretId;
  let spreadsheetId;
  let worksheetId;
  const secret = {
    data: {
      attributes: {
        credentials: {
          access_token: 'access_token',
          refresh_token: 'refresh_token',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.metadata.readonly',
          additional_params: '{"access_type":"offline","prompt":"consent"}',
        },
      },
    },
  };
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    secretId = process.env.SECRET_ID || 'secretId';
    spreadsheetId = process.env.SPREARSHEET_ID || 'some_id';
    worksheetId = process.env.WORKSHEET_ID || 'some_worksheet';
    configuration = {
      secretId,
      spreadsheetId,
      worksheetId,
    };
  });
  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger: log,
    };
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
  });
  afterEach(() => {
    nock.cleanAll();
  });
  describe('dimension = ROWS', async () => {
    describe('mode = header', async () => {
      it('no matches are found, going to create new row', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'ColumnA',
                'ColumnB',
                'ColumnC',
                'ColumnD',
              ],
              [
                'valueA2',
                'valueB2',
                'valueC2',
                'valueD2',
              ],
              [
                'valueA3',
                'valueB3',
                'valueC3',
                'valueD3',
              ],
              [
                'valueA4',
                'valueB4',
                'valueC4',
                'valueD4',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .post(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}:append`, {
            majorDimension: 'ROWS',
            values: [[
              'NewColumnA',
              'NewColumnB',
              'NewColumnC',
              'NewColumnD',
            ]],
          })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            tableRange: 'Sheet1!A1:D4',
            updates: {
              spreadsheetId,
              updatedRange: 'Sheet1!A5:D5',
              updatedRows: 1,
              updatedColumns: 4,
              updatedCells: 4,
            },
          });
        configuration.dimension = 'ROWS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'ColumnC';
        const msg = {
          body: {
            ColumnA: 'NewColumnA',
            ColumnB: 'NewColumnB',
            ColumnC: 'NewColumnC',
            ColumnD: 'NewColumnD',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(1);
        expect(result.body.updates.updatedColumns).to.equal(4);
        expect(result.body.updates.updatedCells).to.equal(4);
      });

      it('more than one match is found, throw an error', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'ColumnA',
                'ColumnB',
                'ColumnC',
                'ColumnD',
              ],
              [
                'valueA2',
                'valueB2',
                'valueC2',
                'valueD2',
              ],
              [
                'valueA3',
                'valueB3',
                'valueC2',
                'valueD3',
              ],
              [
                'valueA4',
                'valueB4',
                'valueC4',
                'valueD4',
              ],
            ],
          });
        configuration.dimension = 'ROWS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'ColumnC';
        const msg = {
          body: {
            ColumnA: 'NewColumnA',
            ColumnB: 'NewColumnB',
            ColumnC: 'valueC2',
            ColumnD: 'NewColumnD',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match is found', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'ColumnA',
                'ColumnB',
                'ColumnC',
                'ColumnD',
              ],
              [
                'valueA2',
                'valueB2',
                'valueC2',
                'valueD2',
              ],
              [
                'valueA3',
                'valueB3',
                'valueC3',
                'valueD3',
              ],
              [
                'valueA4',
                'valueB4',
                'valueC4',
                'valueD4',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .put(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21A2%3AD2?valueInputOption=RAW`,
            {
              majorDimension: 'ROWS',
              values: [
                [
                  'NewColumnA',
                  'NewColumnB',
                  'valueC2',
                  'NewColumnD',
                ],
              ],
            })
          .reply(200, {
            spreadsheetId,
            updatedRange: 'Sheet1!A5:D5',
            updatedRows: 1,
            updatedColumns: 4,
            updatedCells: 4,
          });
        configuration.dimension = 'ROWS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'ColumnC';
        const msg = {
          body: {
            ColumnA: 'NewColumnA',
            ColumnB: 'NewColumnB',
            ColumnC: 'valueC2',
            ColumnD: 'NewColumnD',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updatedRows).to.equal(1);
        expect(result.body.updatedColumns).to.equal(4);
        expect(result.body.updatedCells).to.equal(4);
      });
    });

    xdescribe('mode = array', async () => {
      it('no matches are found, going to create new row, mode = array', async () => {
        configuration.dimension = 'ROWS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 'C';
        const msg = {
          body: {
            A: 'New Value',
            B: 'friendsColumn',
            C: `enemiesColumn ${Date.now()}`,
            D: 'acquaintancesColumn1',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(1);
        expect(result.body.updates.updatedColumns).to.equal(4);
        expect(result.body.updates.updatedCells).to.equal(4);
      });

      it('more than one match is found, throw an error, mode = array', async () => {
        configuration.dimension = 'ROWS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 'C';
        const msg = {
          body: {
            A: 'New Value',
            B: 'friendsColumn',
            C: 'enemiesColumn',
            D: 'acquaintancesColumn1',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match is found, mode = array', async () => {
        configuration.dimension = 'ROWS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 'C';
        const msg = {
          body: {
            A: 'New Value',
            C: '9',
            D: null,
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updatedRows).to.equal(1);
        expect(result.body.updatedColumns).to.equal(4);
        expect(result.body.updatedCells).to.equal(4);
      });
    });
  });

  xdescribe('dimension = COLUMNS', async () => {
    describe('mode = header', async () => {
      it('no matches are found, going to create new column', async () => {
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'California';
        const msg = {
          body: {
            'Common field': 'New Value',
            'New York': 'New York Row',
            California: `California ${Date.now()}`,
            RowsArray: 'RowsArray',
            Kyiv: 'Kyiv',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(5);
        expect(result.body.updates.updatedColumns).to.equal(1);
        expect(result.body.updates.updatedCells).to.equal(5);
      });

      it('more than one match column is found, throw an error', async () => {
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'California';
        const msg = {
          body: {
            'Common field': 'New Value',
            'New York': 'New York Row',
            California: 11,
            RowsArray: 'RowsArray',
            Kyiv: 'Kyiv',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match column is found', async () => {
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'California';
        const msg = {
          body: {
            'Common field': 'New Value',
            California: 3,
            RowsArray: null,
            Kyiv: 'Kyiv',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updatedRows).to.equal(5);
        expect(result.body.updatedColumns).to.equal(1);
        expect(result.body.updatedCells).to.equal(5);
      });
    });

    xdescribe('mode = array', async () => {
      it('no matches are found, going to create new column, mode = array', async () => {
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 3;
        const msg = {
          body: {
            1: 'New Value',
            2: 'New York Row',
            3: `California ${Date.now()}`,
            4: 'RowsArray',
            5: 'Kyiv',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(5);
        expect(result.body.updates.updatedColumns).to.equal(1);
        expect(result.body.updates.updatedCells).to.equal(5);
      });

      it('more than one match column is found, throw an error, mode = array', async () => {
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 3;
        const msg = {
          body: {
            1: 'New Value',
            2: 'New York Row',
            3: 11,
            4: 'RowsArray',
            5: 'Kyiv',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match column is found, mode = array', async () => {
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 3;
        const msg = {
          body: {
            1: 'New Value',
            3: 3,
            4: null,
            5: 'Kyiv',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updatedRows).to.equal(5);
        expect(result.body.updatedColumns).to.equal(1);
        expect(result.body.updatedCells).to.equal(5);
      });
    });
  });
});
