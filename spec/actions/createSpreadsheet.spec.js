const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');
const logger = require('@elastic.io/component-logger')();
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
          access_token: 'ya29.a0ARrdaM_xOkTIY4_fIUz7ADjQlJEhoQHhUADBxE8AIVKRUPHrHYc0jopPkHHlnwCAJiYz6VXgXXOYUgjyVO7-Rc6pCKi9FvGQW4KsuxJuWRLxtzr2LRIFROo27NN24QKoStWnKNI-kVY1R7rnwHCZbhMBAsGREA',
          refresh_token: '1//09WI1Zi8VyLvjCgYIARAAGAkSNwF-L9IrePqeSkTldvtzb3xQ4TuB0MnK-DEaGkkla6_Nss5zqG2N2lb4kLdCpQr07obEus7w4kk',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.metadata.readonly',
          additional_params: '{"access_type":"offline","prompt":"consent"}',
        },
      },
    },
  };

  const wrongSecret = {
    data: {
      attributes: {
        credentials: {
          access_token: 'wrong',
          refresh_token: '1//09WI1Zi8VyLvjCgYIARAAGAkSNwF-L9IrePqeSkTldvtzb3xQ4TuB0MnK-DEaGkkla6_Nss5zqG2N2lb4kLdCpQr07obEus7w4kk',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.metadata.readonly',
          additional_params: '{"access_type":"offline","prompt":"consent"}',
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
      retries: 'one',
    };
  });

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger,
    };
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, wrongSecret)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('success', async () => {
    nock('https://sheets.googleapis.com')
      .post('/v4/spreadsheets')
      .reply(401, { status: 'OK' })
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
