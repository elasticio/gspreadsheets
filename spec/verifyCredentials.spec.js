const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const logger = require('@elastic.io/component-logger')();
// const nock = require('nock');

const sinon = require('sinon');
const verify = require('../verifyCredentials');

chai.use(chaiAsPromised);
let context;

describe('Verify Credentials', () => {
  const configuration = {
    secretId: '62a98dcac5becb0011e5c0af',
  };
  beforeEach(() => {
    context = { logger, emit: sinon.spy() };
  });


  it(' successful update on mocked list Of Spreadsheets', async () => {
    // nock('https://www.googleapis.com')
    //   .get(
    // eslint-disable-next-line max-len
    //     '/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=nextPageToken%2C%20files%28id%2C%20name%29',
    //   )
    //   .reply(200, {
    //     files: [
    //       {
    //         id: 1,
    //         name: 'Sheet1',
    //       },
    //       {
    //         id: 2,
    //         name: 'Sheet2',
    //       },
    //     ],
    //   });

    await verify.call(context, configuration);
  });
});
