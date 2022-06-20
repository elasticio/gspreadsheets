/* eslint-disable no-unused-expressions */
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');

const log = require('@elastic.io/component-logger')();

const createSpreadsheetRow = require('../../lib/actions/createSpreadsheetRow');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Add new row', () => {
  let emitter;

  let configuration;
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
    configuration = {
      spreadsheetId: 'some_id',
      worksheetId: 'some_worksheet',
      mode: 'array',
      secretId,
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

    const result = await createSpreadsheetRow.listWorksheets.call(emitter, configuration);
    expect(result).to.deep.equal({ Sheet1: 'Sheet1', Sheet2: 'Sheet2' });
  });

  it('Generates metadata for array mode', async () => {
    configuration.mode = 'array';
    const result = await createSpreadsheetRow.getMetaModel.call(emitter, configuration);
    expect(result.in).to.exist;
    expect(result.out).to.exist;
    expect(result.in.properties.values).to.be.exist;
  });
  it('Generates metadata for first header mode', async () => {
    configuration.mode = 'header';
    nock('https://sheets.googleapis.com').get(`/v4/spreadsheets/${configuration.spreadsheetId}/values/${configuration.worksheetId}`)
      .reply(200, {
        values: [['header1', 'header 2'], ['value1', 'value2']],
      });
    const result = await createSpreadsheetRow.getMetaModel.call(emitter, configuration);
    expect(result.in).to.exist;
    expect(result.out).to.exist;
    expect(result.in.properties.header1).to.be.exist;
    expect(result.in.properties.header2).to.be.exist;
  });
  it('Header mode error if values not present in first row', async () => {
    configuration.mode = 'header';
    nock('https://sheets.googleapis.com').get(`/v4/spreadsheets/${configuration.spreadsheetId}/values/${configuration.worksheetId}`)
      .reply(200, {
        values: [[], ['value1', 'value2']],
      });
    try {
      await createSpreadsheetRow.getMetaModel.call(emitter, configuration);
      expect(true, 'should fail').to.be.false;
    } catch (e) {
      expect(e.message).to.be.eql('Input Mode: "First Row As Headers" requires first row to have at least one cell with value. Check: Common Errors section in docs.');
    }
  });
  it('Header mode throw error if values not unique', async () => {
    configuration.mode = 'header';
    nock('https://sheets.googleapis.com').get(`/v4/spreadsheets/${configuration.spreadsheetId}/values/${configuration.worksheetId}`)
      .reply(200, {
        values: [['header1', 'header1'], ['value1', 'value2']],
      });
    try {
      await createSpreadsheetRow.getMetaModel.call(emitter, configuration);
      expect(true, 'should fail').to.be.false;
    } catch (e) {
      expect(e.message).to.be.eql('Input Mode: "First Row As Headers" requires cells in first row to be unique. Check: Common Errors section in docs.');
    }
  });
  it('Header mode throw errors if values is blank in first mode', async () => {
    configuration.mode = 'header';
    nock('https://sheets.googleapis.com').get(`/v4/spreadsheets/${configuration.spreadsheetId}/values/${configuration.worksheetId}`)
      .reply(200, {
        values: [['header1', '', 'header3'], ['value1', 'value2']],
      });
    try {
      await createSpreadsheetRow.getMetaModel.call(emitter, configuration);
      expect(true, 'should fail').to.be.false;
    } catch (e) {
      expect(e.message).to.be.eql('Input Mode: "First Row As Headers" requires cells in first row to be not empty. Check: Common Errors section in docs.');
    }
  });
});
