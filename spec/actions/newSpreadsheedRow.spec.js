const fs = require('fs');
const sinon = require('sinon');
const nock = require('nock');

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
  const context = { logger: log, emit: sinon.spy() };

  before(() => {
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
      worksheetName: 'Sheet4',
      includeHeader: 'yes',
      dimension: 'ROWS',
    };

    snapshot = { lastEmittedLine: 1 };
  });

  it('check list of spreadsheets', async () => {
    await listSpreadsheets(configuration);
  });

  it('check list of worksheets', async () => {
    await listWorksheets(configuration);
  });

  it('process', async () => {
    // recorded nock request
    nock('https://oauth2.googleapis.com')
      .post('/token', 'refresh_token=1%2F-TrS0eh4zSVWaUJ27JDmxog008EDw-s9CrgCTUCvrOQ&client_id=708580332494-tbo7u3g58ucof7sni4kklmia2v8thtks.apps.googleusercontent.com&client_secret=JGmWX6XH5p0-0niRV10m8DLb&grant_type=refresh_token')
      .reply(200, ['1f', '8b', '08', '00', '00', '00', '00', '0002ff85d0cd4e83401405e07d9f82b0b6405189ed4ea429b668a934c4b82193e1320c0e0c9d197e06e3bb1bda07707b734ece97fbb3300c13610c52668a7f43636e0c5323776dedd8a0fc87edf1c09a55b7d7c24bfa387e6d7042ce90e2aa8cde3fcf6bc8b13ba2931fd4f0f4e5f6d02505edfd4b3c39611cd67b37d9358f64453288d2cb34e9c0198337468aaa81d82bc3e32052da3ed3886dd1f250e84e2f5ff847a5cef5c9bc9b6130b65480cce8ccbaf71ce77a9598b7303b4ba55ab9b1ed61182cc23961805a2a2dcc6b1b75aab473417bb06a5028470a590250ce1ba68dff7ab29da3b20450f206b9be2653fab6eb031220ccc5ef1ffa7699793e010000'], {
        'content-type': 'application/json; charset=utf-8',
        vary: 'Origin, X-Origin, Referer',
        'content-encoding': 'gzip',
        connection: 'close',
        'transfer-encoding': 'chunked',
      });


    nock('https://www.googleapis.com')
      .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM?fields=id%2Cname%2CmodifiedTime')
      .reply(200, ['1f', '8b', '08', '00', '00', '00', '00', '00', '00', '00', 'ab', 'e6', '52', '50', 'ca', '4c', '51', 'b2', '52', '50324cafca3374768ccf29cbae2aca0a770d09cf08cdcf3048ae8c8c77772a4b2ff73635f574cc4873770fcbf155d2016acb4bcc4d05690c492d2e71492c49040be6e6a764a665a6a6846442248d0c0c2d750dcc748d0c420c0dac0c4dad0c4df4cccd8ca394b86ab90099be83ba7c000000'], {
        expires: 'Thu, 20 Jun 2019 10:54:19 GMT',
        date: 'Thu, 20 Jun 2019 10:54:19 GMT',
        'cache-control': 'private, max-age=0, must-revalidate, no-transform',
        vary: 'Origin, X-Origin',
        'content-type': 'application/json; charset=UTF-8',
        'content-encoding': 'gzip',
        server: 'GSE',
        connection: 'close',
        'transfer-encoding': 'chunked',
      });


    nock('https://sheets.googleapis.com')
      .get('/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet?ranges=Sheet4%21A1%3AZZZ1&ranges=Sheet4%21A3%3AZZZ1003&majorDimension=ROWS')
      .reply(200, ['1f', '8b', '08', '00', '00', '00', '00', '00', '02', 'ff', 'ad', 'd2', '4d', '6f', '82', '30', '18', '07', 'f0', '3b9fa2e3ccc1f2a2e2ad7b2346e712d9246631a6d18e226fa6559669fceeb63d884b6ad6831ca0f93ffcfe3c078e160036df3282d79c12b21baeed01b0617aa8e0135a164d7e609be4e523a19f35edac7ee7cbe8b1497f46413044f43b8a66c59bedc88a06177b32c5554ab828f8121100477517432673d91bcb4ff80f080e10820aaa798937357bce4a52f1acaee48bd3f7246ee7aabced95577b12f3d78cf1dd0497e442543c46224522bd840bebfa7972fe59d3136b86be7bbf4527d92a77ff2e19d31cb3fd16bb575b3ab7b5a7d79e99f6f5da37d3815e0766baabd75d33ddd3eb9e99eeeb75df4c877a1d9a69d8d17391dffa2f2d793a59673a13b0109c030000'], {
        'content-type': 'application/json; charset=UTF-8',
        vary: 'Origin, X-Origin, Referer',
        'content-encoding': 'gzip',
        date: 'Thu, 20 Jun 2019 10:54:21 GMT',
        server: 'ESF',
        connection: 'close',
        'transfer-encoding': 'chunked',
      });


    // nock.recorder.rec();
    // const nockCallObjects = nock.recorder.play();
    // nock.restore();

    await processTrigger.call(context, {}, configuration, snapshot);

  });
});
