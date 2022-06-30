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

    describe('mode = array', async () => {
      it('no matches are found, going to create new row, mode = array', async () => {
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
        configuration.mode = 'array';
        configuration.upsertCriteria = 'C';
        const msg = {
          body: {
            A: 'NewColumnA',
            B: 'NewColumnB',
            C: 'NewColumnC',
            D: 'NewColumnD',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(1);
        expect(result.body.updates.updatedColumns).to.equal(4);
        expect(result.body.updates.updatedCells).to.equal(4);
      });

      it('more than one match is found, throw an error, mode = array', async () => {
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
        configuration.mode = 'array';
        configuration.upsertCriteria = 'C';
        const msg = {
          body: {
            A: 'New Value',
            B: 'friendsColumn',
            C: 'valueC2',
            D: 'acquaintancesColumn1',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match is found, mode = array', async () => {
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
        configuration.mode = 'array';
        configuration.upsertCriteria = 'C';
        const msg = {
          body: {
            A: 'NewColumnA',
            B: 'NewColumnB',
            C: 'valueC2',
            D: 'NewColumnD',
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

  describe('dimension = COLUMNS', async () => {
    describe('mode = header', async () => {
      it('no matches are found, going to create new column', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'Row1',
                'valueB1',
                'valueC1',
              ],
              [
                'Row2',
                'valueB2',
                'valueC2',
              ],
              [
                'Row3',
                'valueB3',
                'valueC3',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .post(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21D1%3AD3:append`, {
            majorDimension: 'COLUMNS',
            values: [
              ['ValueRow1',
                'ValueRow2',
                'ValueRow3']],
          })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            updates: {
              spreadsheetId,
              updatedRange: 'Sheet1!E1:E3',
              updatedRows: 3,
              updatedColumns: 1,
              updatedCells: 3,
            },
          });
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'Row2';
        const msg = {
          body: {
            Row1: 'ValueRow1',
            Row2: 'ValueRow2',
            Row3: 'ValueRow3',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(3);
        expect(result.body.updates.updatedColumns).to.equal(1);
        expect(result.body.updates.updatedCells).to.equal(3);
      });

      it('more than one match column is found, throw an error', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'Row1',
                'valueB1',
                'valueC1',
              ],
              [
                'Row2',
                'valueB2',
                'valueB2',
              ],
              [
                'Row3',
                'valueB3',
                'valueC3',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .post(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21D1%3AD3:append`, {
            majorDimension: 'COLUMNS',
            values: [
              ['ValueRow1',
                'ValueRow2',
                'ValueRow3']],
          })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            updates: {
              spreadsheetId,
              updatedRange: 'Sheet1!E1:E3',
              updatedRows: 3,
              updatedColumns: 1,
              updatedCells: 3,
            },
          });
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'Row2';
        const msg = {
          body: {
            Row1: 'ValueRow1',
            Row2: 'valueB2',
            Row3: 'ValueRow3',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match column is found', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'Row1',
                'valueB1',
                'valueC1',
              ],
              [
                'Row2',
                'valueB2',
                'valueC2',
              ],
              [
                'Row3',
                'valueB3',
                'valueC3',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .put(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21B1%3AB3`, { majorDimension: 'COLUMNS', values: [['ValueRow1', 'valueB2', 'ValueRow3']] })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            updatedRange: 'Sheet1!B1:B3',
            updatedRows: 3,
            updatedColumns: 1,
            updatedCells: 3,
          });
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'header';
        configuration.upsertCriteria = 'Row2';
        const msg = {
          body: {
            Row1: 'ValueRow1',
            Row2: 'valueB2',
            Row3: 'ValueRow3',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updatedRows).to.equal(3);
        expect(result.body.updatedColumns).to.equal(1);
        expect(result.body.updatedCells).to.equal(3);
      });
    });

    describe('mode = array', async () => {
      it('no matches are found, going to create new column, mode = array', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'Row1',
                'valueB1',
                'valueC1',
              ],
              [
                'Row2',
                'valueB2',
                'valueC2',
              ],
              [
                'Row3',
                'valueB3',
                'valueC3',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .post(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21D1%3AD3:append`, {
            majorDimension: 'COLUMNS',
            values: [
              ['ValueRow1',
                'ValueRow2',
                'ValueRow3']],
          })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            updates: {
              spreadsheetId,
              updatedRange: 'Sheet1!E1:E3',
              updatedRows: 3,
              updatedColumns: 1,
              updatedCells: 3,
            },
          });
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 2;
        const msg = {
          body: {
            1: 'ValueRow1',
            2: 'ValueRow2',
            3: 'ValueRow3',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.updates.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updates.updatedRows).to.equal(3);
        expect(result.body.updates.updatedColumns).to.equal(1);
        expect(result.body.updates.updatedCells).to.equal(3);
      });

      it('more than one match column is found, throw an error, mode = array', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'Row1',
                'valueB1',
                'valueC1',
              ],
              [
                'Row2',
                'valueB2',
                'valueB2',
              ],
              [
                'Row3',
                'valueB3',
                'valueC3',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .post(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21D1%3AD3:append`, {
            majorDimension: 'COLUMNS',
            values: [
              ['ValueRow1',
                'ValueRow2',
                'ValueRow3']],
          })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            updates: {
              spreadsheetId,
              updatedRange: 'Sheet1!E1:E3',
              updatedRows: 3,
              updatedColumns: 1,
              updatedCells: 3,
            },
          });
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 2;
        const msg = {
          body: {
            1: 'ValueRow1',
            2: 'valueB2',
            3: 'ValueRow3',
          },
        };
        await expect(upsertSpreadsheetRow.process.call(emitter, msg, configuration)).be.rejectedWith('More than one rows found');
      });

      it('exactly one match column is found, mode = array', async () => {
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .get(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}`)
          .reply(200, {
            range: 'Sheet1!A1:AB1001',
            majorDimension: 'ROWS',
            values: [
              [
                'Row1',
                'valueB1',
                'valueC1',
              ],
              [
                'Row2',
                'valueB2',
                'valueC2',
              ],
              [
                'Row3',
                'valueB3',
                'valueC3',
              ],
            ],
          });
        nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
          .put(`/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}%21B1%3AB3`, { majorDimension: 'COLUMNS', values: [['ValueRow1', 'valueB2', 'ValueRow3']] })
          .query({ valueInputOption: 'RAW' })
          .reply(200, {
            spreadsheetId,
            updatedRange: 'Sheet1!B1:B3',
            updatedRows: 3,
            updatedColumns: 1,
            updatedCells: 3,
          });
        configuration.dimension = 'COLUMNS';
        configuration.mode = 'array';
        configuration.upsertCriteria = 2;
        const msg = {
          body: {
            1: 'ValueRow1',
            2: 'valueB2',
            3: 'ValueRow3',
          },
        };
        const result = await upsertSpreadsheetRow.process.call(emitter, msg, configuration);
        expect(result.body.spreadsheetId).to.equal(spreadsheetId);
        expect(result.body.updatedRows).to.equal(3);
        expect(result.body.updatedColumns).to.equal(1);
        expect(result.body.updatedCells).to.equal(3);
      });
    });
  });
});
