/* eslint-disable no-unused-expressions */
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');
const log = require('@elastic.io/component-logger')();
const usersRows = require('../assets/usersRows.json');
const usersColumns = require('../assets/usersColumns.json');
const usersColumnsNoHeader = require('../assets/usersColumnsNoHeader.json');
const usersRowsNoHeader = require('../assets/usersRowsNoHeader.json');

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

  it('success, rows', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'ROWS',
      useFirstRowAsHeader: 'yes',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=ROWS`)
      .reply(200, { values: usersRows });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([
      {
        Name: 'name1',
        Email: 'name1@email',
        'Slack ID': 'UE48hdaD93name1',
        'Region ID (refer next Sheet)': '31',
      },
      {
        Name: 'name2',
        Email: 'name2@email',
        'Slack ID': 'UE48hdaD93name2',
        'Region ID (refer next Sheet)': '32',
      },
      {
        Name: 'name3',
        Email: 'name3@email',
        'Slack ID': 'UE48hdaD93name3',
        'Region ID (refer next Sheet)': '33',
      },
    ]);
  });
  it('success, columns', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'COLUMNS',
      useFirstRowAsHeader: 'yes',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=COLUMNS`)
      .reply(200, { values: usersColumns });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([
      { Name: 'name1', Email: 'name1@email', Age: '33' },
      { Name: 'name2', Email: 'name2@email', Age: '44' },
      { Name: 'name3', Email: 'name3@email', Age: '5' },
    ]);
  });
  it('success, columns, not use custom header', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'COLUMNS',
      useFirstRowAsHeader: 'no',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=COLUMNS`)
      .reply(200, { values: usersColumnsNoHeader });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([
      { A: 'name1', B: 'name1@email', C: '33' },
      { A: 'name2', B: 'name2@email', C: '44' },
      { A: 'name3', B: 'name3@email', C: '5' },
    ]);
  });
  it('success, rows, not use custom header', async () => {
    const cfg = {
      spreadsheetId: 'spreadsheetId',
      worksheetId: 'worksheetId',
      dimension: 'ROWS',
      useFirstRowAsHeader: 'no',
      emitBehaviour: 'fetchAll',
    };
    const msg = { body: {} };

    nock('https://sheets.googleapis.com:443', { encodedQueryParams: true })
      .get(`/v4/spreadsheets/${cfg.spreadsheetId}/values/${cfg.worksheetId}?majorDimension=ROWS`)
      .reply(200, { values: usersRowsNoHeader });

    const { body } = await readSpreadsheet.process.call(context, msg, { ...cfg, secretId });
    expect(body).to.deep.equal([
      {
        1: 'name1',
        2: 'name1@email',
        3: 'UE48hdaD93name1',
        4: '31',
      },
      {
        1: 'name2',
        2: 'name2@email',
        3: 'UE48hdaD93name2',
        4: '32',
      },
      {
        1: 'name3',
        2: 'name3@email',
        3: 'UE48hdaD93name3',
        4: '33',
      },
    ]);
  });
});
