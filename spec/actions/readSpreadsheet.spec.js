/* eslint-disable no-unused-expressions */
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');

const log = require('@elastic.io/component-logger')();

const readSpreadsheet = require('../../lib/actions/readSpreadsheet');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Read spreadsheet', () => {
  let context;

  process.env.ELASTICIO_API_URI = 'https://app.example.io';
  process.env.ELASTICIO_API_USERNAME = 'user';
  process.env.ELASTICIO_API_KEY = 'apiKey';
  process.env.ELASTICIO_WORKSPACE_ID = 'workspaceId';
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
  const secretId = 'secretId';
  afterEach(() => {
    nock.cleanAll();
  });
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
  });

  beforeEach(() => {
    context = {
      emit: sinon.spy(),
      logger: log,
    };
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
  });

  it('success', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'ROWS',
      includeHeader: 'no',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=ROWS`)
      .reply(200, { values: [[1, 2], [3, 4]] });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([[1, 2], [3, 4]]);
  });
  it('success emit items individually', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'ROWS',
      includeHeader: 'no',
      emitBehaviour: 'emitIndividually',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=ROWS`)
      .reply(200, { values: [[1, 2], [3, 4]] });

    await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(context.emit.callCount).to.be.equal(2);
    const firstEmit = context.emit.getCall(0).args[1].body;
    expect(firstEmit).to.deep.equal([1, 2]);
    const secondEmit = context.emit.getCall(1).args[1].body;
    expect(secondEmit).to.deep.equal([3, 4]);
  });
  it('success skip first item, includeHeader: yes', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'ROWS',
      includeHeader: 'yes',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=ROWS`)
      .reply(200, { values: [[1, 2], [3, 4]] });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([[3, 4]]);
  });
  it('success, dimension: COLUMNS ', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'COLUMNS',
      includeHeader: 'no',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=COLUMNS`)
      .reply(200, { values: [[1, 3], [2, 4]] });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([[1, 3], [2, 4]]);
  });
});
