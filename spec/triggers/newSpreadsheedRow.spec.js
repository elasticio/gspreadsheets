const fs = require('fs');
const sinon = require('sinon');
const nock = require('nock');
const chai = require('chai');

const { expect } = chai;

const log = require('@elastic.io/component-logger')();

const { listSpreadsheets, listWorksheets, process: processTrigger } = require(
  '../../lib/triggers/newSpreadsheetRow',
);

describe('newSpreadsheetRow', () => {
  let configuration;
  let snapshot;
  if (fs.existsSync('.env')) {
    // eslint-disable-next-line global-require
    require('dotenv').config({ path: '.env-test' });
  }
  let context;

  before(() => {
    configuration = {
      oauth: {
        access_token: process.env.ACCESS_TOKEN,
        expires_in: 3600,
        refresh_token: process.env.REFRESH_TOKEN,
        scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
        token_type: 'Bearer',
        expiry_date: new Date().getTime() + 1000,
      },
      spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
      worksheetName: 'Sheet4',
      includeHeader: 'yes',
      dimension: 'ROWS',
    };

    snapshot = { lastEmittedLine: 0 };
  });

  beforeEach(() => {
    context = { logger: log, emit: sinon.spy() };
  });

  it('check list of spreadsheets', async () => {
    await listSpreadsheets(configuration);
  });

  it('check list of worksheets', async () => {
    await listWorksheets(configuration);
  });

  describe('process', () => {
    describe('ROWS dimension', () => {
      it('lastEmittedLine: 0, includeHeader: yes',
        async () => {
          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: ['Sheet4!A1:ZZZ1', 'Sheet4!A2:ZZZ1001'],
              majorDimension: 'ROWS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet4!A1:AA1',
                  majorDimension: 'ROWS',
                  values: [
                    [
                      'FirstName',
                      'LastName',
                    ],
                  ],
                },
                {
                  range: 'Sheet4!A2:AA942',
                  majorDimension: 'ROWS',
                  values: [
                    ['Tom1', 'Smith1'],
                    ['Tom2', 'Smith2'],
                    ['Tom3', 'Smith3'],
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10'],
                  ],
                },
              ],
            },
            ['Content-Type', 'application/json; charset=UTF-8']);
          // nock.recorder.rec();
          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(11);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
        });

      it('lastEmittedLine: 4, includeHeader: yes',
        async () => {
          snapshot = { lastEmittedLine: 4 };

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: ['Sheet4!A1:ZZZ1', 'Sheet4!A5:ZZZ1004'],
              majorDimension: 'ROWS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet4!A1:AA1',
                  majorDimension: 'ROWS',
                  values: [['FirstName', 'LastName']],
                },
                {
                  range: 'Sheet4!A5:AA942',
                  majorDimension: 'ROWS',
                  values: [
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);
          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(8);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            FirstName: 'Tom4',
            LastName: 'Smith4',
          });
        });

      it('lastEmittedLine: 0, includeHeader: no',
        async () => {
          snapshot = { lastEmittedLine: 0 };
          configuration.includeHeader = 'no';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: 'Sheet4!A1:ZZZ1001',
              majorDimension: 'ROWS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet4!A1:AA942',
                  majorDimension: 'ROWS',
                  values: [
                    ['FirstName', 'LastName'],
                    ['Tom1', 'Smith1'],
                    ['Tom2', 'Smith2'],
                    ['Tom3', 'Smith3'],
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(12);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            A: 'FirstName',
            B: 'LastName',
          });
        });

      it('lastEmittedLine: 4, includeHeader: no',
        async () => {
          snapshot = { lastEmittedLine: 4 };
          configuration.includeHeader = 'no';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: 'Sheet4!A5:ZZZ1005',
              majorDimension: 'ROWS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet4!A5:AA942',
                  majorDimension: 'ROWS',
                  values: [
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(8);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            A: 'Tom4',
            B: 'Smith4',
          });
        });
    });

    describe('COLUMNS dimension', () => {
      it('lastEmittedLine: 0, includeHeader: yes',
        async () => {
          snapshot = { lastEmittedLine: 0 };
          configuration.includeHeader = 'yes';
          configuration.dimension = 'COLUMNS';
          configuration.worksheetName = 'Sheet1';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: ['Sheet1!A1:A18278', 'Sheet1!B1:ALM18278'],
              majorDimension: 'COLUMNS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet1!A1:A982',
                  majorDimension: 'COLUMNS',
                  values: [['FirstName', 'LastName']],
                },
                {
                  range: 'Sheet1!B1:Z982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['Tom1', 'Smith1'],
                    ['Tom2', 'Smith2'],
                    ['Tom3', 'Smith3'],
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(11);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            FirstName: 'Tom1',
            LastName: 'Smith1',
          });
        });

      it('lastEmittedLine: 4, includeHeader: yes',
        async () => {
          snapshot = { lastEmittedLine: 4 };
          configuration.includeHeader = 'yes';
          configuration.dimension = 'COLUMNS';
          configuration.worksheetName = 'Sheet1';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: ['Sheet1!A1:A18278', 'Sheet1!E1:ALP18278'],
              majorDimension: 'COLUMNS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet1!A1:A982',
                  majorDimension: 'COLUMNS',
                  values: [['FirstName', 'LastName']],
                },
                {
                  range: 'Sheet1!E1:Z982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(8);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            FirstName: 'Tom4',
            LastName: 'Smith4',
          });
        });

      it('lastEmittedLine: 0, includeHeader: no',
        async () => {
          snapshot = { lastEmittedLine: 0 };
          configuration.includeHeader = 'no';
          configuration.dimension = 'COLUMNS';
          configuration.worksheetName = 'Sheet1';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: 'Sheet1!A1:ALM18278',
              majorDimension: 'COLUMNS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet1!A1:Z982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['FirstName', 'LastName'],
                    ['Tom1', 'Smith1'],
                    ['Tom2', 'Smith2'],
                    ['Tom3', 'Smith3'],
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(12);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            1: 'FirstName',
            2: 'LastName',
          });
        });

      it('lastEmittedLine: 4, includeHeader: no',
        async () => {
          snapshot = { lastEmittedLine: 4 };
          configuration.includeHeader = 'no';
          configuration.dimension = 'COLUMNS';
          configuration.worksheetName = 'Sheet1';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: 'Sheet1!E1:ALQ18278',
              majorDimension: 'COLUMNS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet1!E1:Z982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['Tom4', 'Smith4'],
                    ['Tom5', 'Smith5'],
                    ['Tom6', 'Smith6'],
                    ['Tom7', 'Smith7'],
                    ['Tom8', 'Smith8'],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          // nock.recorder.rec();

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(8);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1]).to.deep.equal({
            modifiedTime: 1561025714763,
            lastEmittedLine: 11,
          });
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            1: 'Tom4',
            2: 'Smith4',
          });
        });
    });

    it('not need to read changes',
      async () => {
        const conf = Object.create(configuration);
        conf.includeHeader = 'no';
        conf.dimension = 'COLUMNS';
        conf.worksheetName = 'Sheet1';
        const snap = {
          lastEmittedLine: 4,
          modifiedTime: new Date('2019-06-20T10:15:14.763Z').getTime() + 1000,
        };
        nock('https://www.googleapis.com:443', { encodedQueryParams: true })
          .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
          .query({ fields: 'id%2Cname%2CmodifiedTime' })
          .reply(200, {
            id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            name: 'TestData',
            modifiedTime: '2019-06-20T10:15:14.763Z',
          });
        // nock.recorder.rec();

        await processTrigger.call(context, {}, conf, snap);
      });

    it('not updated document',
      async () => {
        const conf = Object.create(configuration);
        conf.includeHeader = 'no';
        conf.dimension = 'COLUMNS';
        conf.worksheetName = 'Sheet1';
        const snap = {
          lastEmittedLine: 11,
          modifiedTime: new Date('2019-06-20T10:15:14.763Z').getTime() - 1000,
        };
        nock('https://www.googleapis.com:443', { encodedQueryParams: true })
          .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
          .query({ fields: 'id%2Cname%2CmodifiedTime' })
          .reply(200, {
            id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            name: 'TestData',
            modifiedTime: '2019-06-20T10:15:14.763Z',
          });
        nock('https://sheets.googleapis.com:443',
          { encodedQueryParams: true })
          .get(
            '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
          )
          .query({
            ranges: 'Sheet1!L1:ALX18278',
            majorDimension: 'COLUMNS',
          })
          .reply(200, {
            spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            valueRanges: [
              {
                range: 'Sheet1!L1:Z982',
                majorDimension: 'COLUMNS',
              }],
          }, ['Content-Type', 'application/json; charset=UTF-8']);

        // nock.recorder.rec();

        await processTrigger.call(context, {}, conf, snap);
      });
  });
});
