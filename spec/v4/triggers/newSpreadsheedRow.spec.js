const sinon = require('sinon');
const nock = require('nock');
const chai = require('chai');

const { expect } = chai;

const log = require('@elastic.io/component-logger')();

const { process: processTrigger } = require(
  '../../../lib/triggers/newSpreadsheetRow',
);

process.env.GOOGLE_APP_ID = '708580332494-tbo7u3g58ucof7sni4kklmia2v8thtks.apps.googleusercontent.com';
process.env.GOOGLE_APP_SECRET = 'JGmWX6XH5p0-0niRV10m8DLb';
process.env.ACCESS_TOKEN = 'ya29.GlwzB0Owy9YKIifRKK9TLOIi6EbcKgGZj7A9L52XfqoAbUGOSIroU-fBaym_TTWD0J50a1mMkQZlrxTvf-wNS0ugbVj03jtWtlX1SP2RCupsXRR2nzJ4uvf_V2ueHw';
process.env.REFRESH_TOKEN = '1/-TrS0eh4zSVWaUJ27JDmxog008EDw-s9CrgCTUCvrOQ';
process.env.TEST_REDIRECT_URL = 'urn:ietf:wg:oauth:2.0:oob';

describe('newSpreadsheetRow', () => {
  let configuration;
  let snapshot;
  let context;

  before(() => {
    configuration = {
      oauth: {
        access_token: process.env.ACCESS_TOKEN,
        expires_in: 3600,
        refresh_token: process.env.REFRESH_TOKEN,
        scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
        token_type: 'Bearer',
        expiry_date: new Date().getTime() + 10000000000,
      },
      spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
      worksheetName: 'ROWS Dimension',
      includeHeader: 'yes',
      dimension: 'ROWS',
    };

    snapshot = { lastEmittedLine: 0 };
  });

  beforeEach(() => {
    context = { logger: log, emit: sinon.spy() };
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
              ranges: ['ROWS Dimension!A1:GJH1', 'ROWS Dimension!A2:GJH1001'],
              majorDimension: 'ROWS',
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
            },
            ['Content-Type', 'application/json; charset=UTF-8']);
          // nock.recorder.rec();
          await processTrigger.call(context, {}, configuration, snapshot);
          expect(context.emit.getCalls().length).to.be.equal(11);
          expect(context.emit.lastCall.args[0]).to.be.equal('snapshot');
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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
              ranges: ['ROWS Dimension!A1:GJH1', 'ROWS Dimension!A5:GJH1004'],
              majorDimension: 'ROWS',
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
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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
              ranges: 'ROWS Dimension!A1:GJH1000',
              majorDimension: 'ROWS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: '\'ROWS Dimension\'!A1:AA942',
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
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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
              ranges: 'ROWS Dimension!A5:GJH1004',
              majorDimension: 'ROWS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: '\'ROWS Dimension\'!A5:AA942',
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
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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
          configuration.worksheetName = 'COLUMNS Dimension';

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
              ranges: ['COLUMNS Dimension!A1:A5000', 'COLUMNS Dimension!B1:ALM5000'],
              majorDimension: 'COLUMNS',
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
                  range: '\'COLUMNS Dimension\'!B1:AB982',
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
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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
          configuration.worksheetName = 'COLUMNS Dimension';

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
              ranges: ['COLUMNS Dimension!A1:A5000', 'COLUMNS Dimension!E1:ALP5000'],
              majorDimension: 'COLUMNS',
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
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
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
          configuration.worksheetName = 'COLUMNS Dimension';

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
              ranges: 'COLUMNS Dimension!A1:ALL5000',
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
          configuration.worksheetName = 'COLUMNS Dimension';

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
              ranges: 'COLUMNS Dimension!E1:ALP5000',
              majorDimension: 'COLUMNS',
            })
            .reply(200, {
              spreadsheetId: '1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM',
              valueRanges: [
                {
                  range: '\'COLUMNS Dimension\'!E1:AB982',
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
          expect(context.emit.lastCall.args[1].lastEmittedLine).to.be.equal(11);
          expect(context.emit.firstCall.args[1].body).to.deep.equal({
            1: 'Tom4',
            2: 'Smith4',
          });
        });
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
            ranges: 'Sheet1!L1:ALW5000',
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
