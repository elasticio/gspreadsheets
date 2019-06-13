const fs = require('fs');

const create = require('../../lib/actions/create');

describe('Create spreadsheet', function () {
  this.timeout(50000);
  let configuration;
  let emitter;
  let msg;

  before(async () => {
    // if (fs.existsSync('.env')) {
    //   require('dotenv').config();
    // }

    configuration = JSON.parse(fs.readFileSync('credentials.json')).installed;
    configuration.oauth2  = JSON.parse(fs.readFileSync('token.json'))
  });

  beforeEach(() => {
    // emitter = {
    //   emit: sinon.spy(),
    // };

    msg = {
      properties: {
        title: 'Node JS generate J-sheet'
      }
    };
  });

  it('Create', async () => {
    await create.process(msg, configuration);
  });
});
