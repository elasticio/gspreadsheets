const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');

const createSpreadsheet = require('../../lib/actions/createSpreadsheet');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Add new spreadsheet', () => {
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
          access_token: 'accessToken',
        },
      },
    },
  };
  const secretId = 'secretId';
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      secretId,
    };
  });

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger: {
        trace: sinon.spy(),
        debug: sinon.spy(),
      },
    };
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('success', async () => {
    nock('https://sheets.googleapis.com')
      .post('/v4/spreadsheets')
      .reply(200, { status: 'OK' });

    const msg = {
      body: {
        properties: { title: 'Some name' },
        sheets: [
          { properties: { title: 'Sheet A' } },
          { properties: { title: 'Sheet B' } },
        ],
      },
    };

    const result = await createSpreadsheet.process.call(emitter, msg, configuration);

    expect(result.body).to.deep.equal({ status: 'OK' });
  });
});
