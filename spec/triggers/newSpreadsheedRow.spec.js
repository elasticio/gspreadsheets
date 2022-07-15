const sinon = require('sinon');
const nock = require('nock');
const chai = require('chai');

const { expect } = chai;

const log = require('@elastic.io/component-logger')();

const { process: processTrigger } = require(
  '../../lib/triggers/newSpreadsheetRow',
);

const worksheetId = '23742873';
const worksheetName = 'Sheet A';
const listWorksheetsReply = {
  sheets: [
    {
      properties: {
        sheetId: worksheetId,
        title: worksheetName,
      },
    },
  ],
};

describe('newSpreadsheetRow', () => {
  let configuration;
  let snapshot;
  let context;
  process.env.ELASTICIO_API_URI = 'https://app.example.io';
  process.env.ELASTICIO_API_USERNAME = 'user';
  process.env.ELASTICIO_API_KEY = 'apiKey';
  process.env.ELASTICIO_WORKSPACE_ID = 'workspaceId';
  const secret = {
    data: {
      attributes: {
        credentials: {
          access_token: 'accessToken',
        },
      },
    },
  };
  const secretId = 'secretId';
  afterEach(() => {
    nock.cleanAll();
  });

  before(() => {
    configuration = {
      secretId,
      spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
      worksheetId,
      includeHeader: 'yes',
      dimension: 'ROWS',
    };

    snapshot = { lastEmittedLine: 0 };
  });

  beforeEach(() => {
    context = { logger: log, emit: sinon.spy() };
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
    nock('https://sheets.googleapis.com')
      .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
      .reply(200, listWorksheetsReply);
  });

  describe('process', () => {
    describe('ROWS dimension', () => {
      it('lastEmittedLine: 0, includeHeader: yes', async () => {
        nock('https://www.googleapis.com:443', { encodedQueryParams: true })
          .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
          .query({ fields: 'id%2Cname%2CmodifiedTime' })
          .reply(200, {
            id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            name: 'TestData',
            modifiedTime: '2019-06-20T10:15:14.763Z',
          });
        nock('https://sheets.googleapis.com')
          .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
          .reply(200, listWorksheetsReply);

        nock('https://sheets.googleapis.com:443',
          { encodedQueryParams: true })
          .get(
            '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
          )
          .query({
            ranges: ['Sheet A!A1:GJH1', 'Sheet A!A2:GJH1001'],
            majorDimension: 'ROWS',
            valueRenderOption: 'UNFORMATTED_VALUE',
          })
          .reply(200, {
            spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            valueRanges: [
              {
                range: '\'ROWS Dimension\'!A1:AA1',
                majorDimension: 'ROWS',
                values: [['FirstName', 'LastName']],
              },
              {
                range: '\'ROWS Dimension\'!A2:AA942',
                majorDimension: 'ROWS',
                values: [
                  ['Tom1', 0],
                  ['Tom2', true],
                  ['Tom3', false],
                  ['Tom4', 1],
                  ['Tom5', -1],
                  ['Tom6', 3.1415],
                  ['Tom7', -123.456],
                  ['Tom8', -3.1415],
                  ['Tom9', 'Smith9'],
                  ['Tom10', 'Smith10']],
              }],
          }, ['Content-Type', 'application/json; charset=UTF-8']);
        await processTrigger.call(context, {}, configuration, snapshot);
        expect(context.emit.getCalls().length).to.be.equal(11);
        expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
        expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
      });

      it('lastEmittedLine: 4, includeHeader: yes', async () => {
        snapshot = { lastEmittedLine: 4 };

        nock('https://www.googleapis.com:443', { encodedQueryParams: true })
          .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
          .query({ fields: 'id%2Cname%2CmodifiedTime' })
          .reply(200, {
            id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            name: 'TestData',
            modifiedTime: '2019-06-20T10:15:14.763Z',
          });
        nock('https://sheets.googleapis.com')
          .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
          .reply(200, listWorksheetsReply);

        nock('https://sheets.googleapis.com:443',
          { encodedQueryParams: true })
          .get(
            '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
          )
          .query({
            ranges: ['Sheet A!A1:GJH1', 'Sheet A!A5:GJH1004'],
            majorDimension: 'ROWS',
            valueRenderOption: 'UNFORMATTED_VALUE',
          })
          .reply(200, {
            spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            valueRanges: [
              {
                range: '\'ROWS Dimension\'!A1:AA1',
                majorDimension: 'ROWS',
                values: [['FirstName', 'LastName']],
              },
              {
                range: '\'ROWS Dimension\'!A5:AA942',
                majorDimension: 'ROWS',
                values: [
                  ['Tom4', 1],
                  ['Tom5', -1],
                  ['Tom6', 3.1415],
                  ['Tom7', -123.456],
                  ['Tom8', -3.1415],
                  ['Tom9', 'Smith9'],
                  ['Tom10', 'Smith10']],
              }],
          }, ['Content-Type', 'application/json; charset=UTF-8']);

        await processTrigger.call(context, {}, configuration, snapshot);
        expect(context.emit.getCalls().length).to.be.equal(8);
        expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
        expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
        expect(context.emit.firstCall.args[1].body).to.deep.equal({
          FirstName: 'Tom4',
          LastName: 1,
        });
      });

      it('lastEmittedLine: 0, includeHeader: no', async () => {
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
        nock('https://sheets.googleapis.com')
          .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
          .reply(200, listWorksheetsReply);

        nock('https://sheets.googleapis.com:443',
          { encodedQueryParams: true })
          .get(
            '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
          )
          .query({
            ranges: 'Sheet A!A1:GJH1000',
            majorDimension: 'ROWS',
            valueRenderOption: 'UNFORMATTED_VALUE',
          })
          .reply(200, {
            spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            valueRanges: [
              {
                range: '\'ROWS Dimension\'!A1:AA942',
                majorDimension: 'ROWS',
                values: [
                  ['FirstName', 'LastName'],
                  ['Tom1', 0],
                  ['Tom2', true],
                  ['Tom3', false],
                  ['Tom4', 1],
                  ['Tom5', -1],
                  ['Tom6', 3.1415],
                  ['Tom7', -123.456],
                  ['Tom8', -3.1415],
                  ['Tom9', 'Smith9'],
                  ['Tom10', 'Smith10']],
              }],
          }, ['Content-Type', 'application/json; charset=UTF-8']);

        await processTrigger.call(context, {}, configuration, snapshot);
        expect(context.emit.getCalls().length).to.be.equal(12);
        expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
        expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
        expect(context.emit.firstCall.args[1].body).to.deep.equal({
          A: 'FirstName',
          B: 'LastName',
        });
      });

      it('lastEmittedLine: 4, includeHeader: no', async () => {
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
        nock('https://sheets.googleapis.com')
          .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
          .reply(200, listWorksheetsReply);

        nock('https://sheets.googleapis.com:443',
          { encodedQueryParams: true })
          .get(
            '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
          )
          .query({
            ranges: 'Sheet A!A5:GJH1004',
            majorDimension: 'ROWS',
            valueRenderOption: 'UNFORMATTED_VALUE',
          })
          .reply(200, {
            spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            valueRanges: [
              {
                range: '\'ROWS Dimension\'!A5:AA942',
                majorDimension: 'ROWS',
                values: [
                  ['Tom4', 1],
                  ['Tom5', -1],
                  ['Tom6', 3.1415],
                  ['Tom7', -123.456],
                  ['Tom8', -3.1415],
                  ['Tom9', 'Smith9'],
                  ['Tom10', 'Smith10']],
              }],
          }, ['Content-Type', 'application/json; charset=UTF-8']);

        await processTrigger.call(context, {}, configuration, snapshot);
        expect(context.emit.getCalls().length).to.be.equal(8);
        expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
        expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
        expect(context.emit.firstCall.args[1].body).to.deep.equal({
          A: 'Tom4',
          B: 1,
        });
      });
    });

    describe('COLUMNS dimension', () => {
      it('lastEmittedLine: 0, includeHeader: yes',
        async () => {
          snapshot = { lastEmittedLine: 0 };
          configuration.includeHeader = 'yes';
          configuration.dimension = 'COLUMNS';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });
          nock('https://sheets.googleapis.com')
            .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
            .reply(200, listWorksheetsReply);

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: ['Sheet A!A1:A5000', 'Sheet A!B1:ALM5000'],
              majorDimension: 'COLUMNS',
              valueRenderOption: 'UNFORMATTED_VALUE',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: '\'COLUMNS Dimension\'!A1:A982',
                  majorDimension: 'COLUMNS',
                  values: [['FirstName', 'LastName']],
                  valueRenderOption: 'UNFORMATTED_VALUE',
                },
                {
                  range: '\'COLUMNS Dimension\'!B1:AB982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['Tom1', 0],
                    ['Tom2', true],
                    ['Tom3', false],
                    ['Tom4', 1],
                    ['Tom5', -1],
                    ['Tom6', 3.1415],
                    ['Tom7', -123.456],
                    ['Tom8', -3.1415],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(11);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            FirstName: 'Tom1',
            LastName: 0,
          });
        });

      it('lastEmittedLine: 4, includeHeader: yes',
        async () => {
          snapshot = { lastEmittedLine: 4 };
          configuration.includeHeader = 'yes';
          configuration.dimension = 'COLUMNS';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });
          nock('https://sheets.googleapis.com')
            .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
            .reply(200, listWorksheetsReply);
          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: ['Sheet A!A1:A5000', 'Sheet A!E1:ALP5000'],
              majorDimension: 'COLUMNS',
              valueRenderOption: 'UNFORMATTED_VALUE',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: '\'COLUMNS Dimension\'!A1:A982',
                  majorDimension: 'COLUMNS',
                  values: [['FirstName', 'LastName']],
                },
                {
                  range: '\'COLUMNS Dimension\'!E1:AB982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['Tom4', 1],
                    ['Tom5', -1],
                    ['Tom6', 3.1415],
                    ['Tom7', -123.456],
                    ['Tom8', -3.1415],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(8);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            FirstName: 'Tom4',
            LastName: 1,
          });
        });

      it('lastEmittedLine: 0, includeHeader: no',
        async () => {
          snapshot = { lastEmittedLine: 0 };
          configuration.includeHeader = 'no';
          configuration.dimension = 'COLUMNS';

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });
          nock('https://sheets.googleapis.com')
            .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
            .reply(200, listWorksheetsReply);

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: 'Sheet A!A1:ALL5000',
              majorDimension: 'COLUMNS',
              valueRenderOption: 'UNFORMATTED_VALUE',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: 'Sheet1!A1:Z982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['FirstName', 'LastName'],
                    ['Tom1', 0],
                    ['Tom2', true],
                    ['Tom3', false],
                    ['Tom4', 1],
                    ['Tom5', -1],
                    ['Tom6', 3.1415],
                    ['Tom7', -123.456],
                    ['Tom8', -3.1415],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(12);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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

          nock('https://www.googleapis.com:443', { encodedQueryParams: true })
            .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
            .query({ fields: 'id%2Cname%2CmodifiedTime' })
            .reply(200, {
              id: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              name: 'TestData',
              modifiedTime: '2019-06-20T10:15:14.763Z',
            });
          nock('https://sheets.googleapis.com')
            .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
            .reply(200, listWorksheetsReply);

          nock('https://sheets.googleapis.com:443',
            { encodedQueryParams: true })
            .get(
              '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
            )
            .query({
              ranges: 'Sheet A!E1:ALP5000',
              majorDimension: 'COLUMNS',
              valueRenderOption: 'UNFORMATTED_VALUE',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: '\'COLUMNS Dimension\'!E1:AB982',
                  majorDimension: 'COLUMNS',
                  values: [
                    ['Tom4', 1],
                    ['Tom5', -1],
                    ['Tom6', 3.1415],
                    ['Tom7', -123.456],
                    ['Tom8', -3.1415],
                    ['Tom9', 'Smith9'],
                    ['Tom10', 'Smith10']],
                }],
            }, ['Content-Type', 'application/json; charset=UTF-8']);

          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(8);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            1: 'Tom4',
            2: 1,
          });
        });
    });

    it('not updated document',
      async () => {
        const conf = Object.create(configuration);
        conf.includeHeader = 'no';
        conf.dimension = 'COLUMNS';
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
        nock('https://sheets.googleapis.com')
          .get(`/v4/spreadsheets/${configuration.spreadsheetId}`)
          .reply(200, listWorksheetsReply);

        nock('https://sheets.googleapis.com:443',
          { encodedQueryParams: true })
          .get(
            '/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet',
          )
          .query({
            ranges: 'Sheet A!L1:ALW5000',
            majorDimension: 'COLUMNS',
            valueRenderOption: 'UNFORMATTED_VALUE',
          })
          .reply(200, {
            spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
            valueRanges: [
              {
                range: 'Sheet1!L1:Z982',
                majorDimension: 'COLUMNS',
              }],
          }, ['Content-Type', 'application/json; charset=UTF-8']);


        await processTrigger.call(context, {}, conf, snap);
      });
  });
});
