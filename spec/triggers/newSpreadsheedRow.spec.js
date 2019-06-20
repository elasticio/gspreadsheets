const fs = require('fs');
const sinon = require('sinon');
const nock = require('nock');
const chai = require('chai');

const { expect } = chai;


const log = require('@elastic.io/component-logger')();

const { listSpreadsheets, listWorksheets, process: processTrigger } = require('../../lib/triggers/newSpreadsheetRow');

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

    snapshot = { lastEmittedLine: 0 };
  });

  it('check list of spreadsheets', async () => {
    await listSpreadsheets(configuration);
  });

  it('check list of worksheets', async () => {
    await listWorksheets(configuration);
  });

  describe('process', () => {
    it('process dimension: ROWS, lastEmittedLine: 0, includeHeader: yes', async () => {
      nock('https://oauth2.googleapis.com:443', { encodedQueryParams: true })
        .post('/token', 'refresh_token=1%2F-TrS0eh4zSVWaUJ27JDmxog008EDw-s9CrgCTUCvrOQ&client_id=708580332494-tbo7u3g58ucof7sni4kklmia2v8thtks.apps.googleusercontent.com&client_secret=JGmWX6XH5p0-0niRV10m8DLb&grant_type=refresh_token')
        .reply(200, ['1f', '8b', '08', '00', '0000000002ff85d0cd4e83401405e07d9f82b056282036edaeb5151a254a8258d99061b885919f99ce4c61a6c67737b40fe0f6e69c9c2ff767661826c21884c8256da0375786a991bbb48276949b452bdba6be10c7457eb4ff681ac57cfeeddf634ec8f850eaac08c5e7eb73371ca2657808559e7c9dde0ae5b93c4eeb45a38378370e3166d9ce09b83ba8f6e934bca7c3de4b5e3a2654baf6bd4864fabc2db2639f34f4e8e4055b6fa3cabc9b60a018e1207232b1bcc7f9fc7a159832989cb5944cac6c7b1c47aba2b46a0131222c4c3b1b9d656d0bc60195a20690c2f82f5c723280d581442592c89a9ab46ff50d727d4d2ef56d770388033767bf7fd745c2e53e010000'], ['Content-Type',
          'application/json; charset=utf-8',
          'Vary',
          'Origin',
          'Vary',
          'X-Origin',
          'Vary',
          'Referer',
          'Content-Encoding',
          'gzip',
          'Date',
          'Thu, 20 Jun 2019 13:06:34 GMT',
          'Server',
          'scaffolding on HTTPServer2',
          'Cache-Control',
          'private',
          'X-XSS-Protection',
          '0',
          'X-Frame-Options',
          'SAMEORIGIN',
          'X-Content-Type-Options',
          'nosniff',
          'Alt-Svc',
          'quic=":443"; ma=2592000; v="46,44,43,39"',
          'Connection',
          'close',
          'Transfer-Encoding',
          'chunked']);


      nock('https://www.googleapis.com:443', { encodedQueryParams: true })
        .get('/drive/v3/files/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM')
        .query({ fields: 'id%2Cname%2CmodifiedTime' })
        .reply(200, ['1f', '8b0800000000000000abe65250ca4c51b25250324cafca3374768ccf29cbae2aca0a770d09cf08cdcf3048ae8c8c77772a4b2ff73635f574cc4873770fcbf155d2016acb4bcc4d05690c492d2e71492c49040be6e6a764a665a6a6846442248d0c0c2d750dcc748d0c420c0dac0c4dad0c4df4cccd8ca394b86ab90099be83ba7c000000'], ['Expires',
          'Thu, 20 Jun 2019 13:06:34 GMT',
          'Date',
          'Thu, 20 Jun 2019 13:06:34 GMT',
          'Cache-Control',
          'private, max-age=0, must-revalidate, no-transform',
          'Vary',
          'Origin',
          'Vary',
          'X-Origin',
          'Content-Type',
          'application/json; charset=UTF-8',
          'Content-Encoding',
          'gzip',
          'X-Content-Type-Options',
          'nosniff',
          'X-Frame-Options',
          'SAMEORIGIN',
          'X-XSS-Protection',
          '1; mode=block',
          'Server',
          'GSE',
          'Alt-Svc',
          'quic=":443"; ma=2592000; v="46,44,43,39"',
          'Connection',
          'close',
          'Transfer-Encoding',
          'chunked']);


      nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
        .get('/v4/spreadsheets/1gzn1CA_lvkzrjWETWhUoh0cyY_GBvgwK55IAhfGGVlM/values:batchGet')
        .query({ ranges: 'Sheet4%21A2%3AZZZ1002', majorDimension: 'ROWS' })
        .reply(200, ['1f', '8b', '08', '00', '00', '00', '000002ffadd24d6f82301807f03b9fa2e3cc8122a878ebde88d9a689e8c8b22ca6d18e226fa655cc347e77db1ec42525eb611c4af37ffa7bfa1c7ab200b0f99611bce69490dd786d8f800dd363051fd0b268f223db244ff3842e6aeaae7e3e96d17d931e5e82608ce87714bd176fb6235b34b8d89319ae52c245834f11017052ab283299cbbeb1bcc2bf437084105450d54bbca9d96356928a6775250fcea649dcd655f3b6affcda9da83f678cef26b82457a2e257245224d26bf865ddfecfce1f637a62ccd0f7fe6fd049b6cae1ef21639a63b6df627833a5d3ad3dbdf6cc744faf7b66dad76bdf4c077a1d98e9be5ef7cdf440af07667aa8d743331dea7568a6a1dbf15cdcce576dc9ddd9ba004decd02cda030000'], ['Content-Type',
          'application/json; charset=UTF-8',
          'Vary',
          'Origin',
          'Vary',
          'X-Origin',
          'Vary',
          'Referer',
          'Content-Encoding',
          'gzip',
          'Date',
          'Thu, 20 Jun 2019 13:06:35 GMT',
          'Server',
          'ESF',
          'Cache-Control',
          'private',
          'X-XSS-Protection',
          '0',
          'X-Frame-Options',
          'SAMEORIGIN',
          'Alt-Svc',
          'quic=":443"; ma=2592000; v="46,44,43,39"',
          'Connection',
          'close',
          'Transfer-Encoding',
          'chunked']);


      nock.recorder.rec();


      await processTrigger.call(context, {}, configuration, snapshot);
      const nockCallObjects = nock.recorder.play();
      console.log(nockCallObjects);
      nock.restore();
      expect(context.emit.getCalls().length).to.be.equal(11);
    });
  });
});
