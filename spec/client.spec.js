const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const { GoogleOauth2Client } = require('../lib/client');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Google client', function() {
  this.timeout(5000);

  let configuration;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      oauth: {
        access_token: process.env.ACCESS_TOKEN,
        expiry_date: 1560935120410,
        refresh_token: process.env.REFRESH_TOKEN,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
        token_type: 'Bearer',
      },
    };
  });

  it('list Of Spreadsheets', async () => {
    const googleOauth2Client = new GoogleOauth2Client(configuration);
    const result = await googleOauth2Client.listOfSpreadsheets();
    console.log(JSON.stringify(result));
  });

  it('list Of worksheets', async () => {
    const googleOauth2Client = new GoogleOauth2Client(configuration);
    const result = await googleOauth2Client.listOfWorksheets('1f6o4Xun9VLaYqHCnTJ6b_cFlmT0xO7Lp85Fg73GBCLk');
    console.log(JSON.stringify(result));
  });
});
