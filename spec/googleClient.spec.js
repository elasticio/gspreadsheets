const {google} = require('googleapis');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect } = chai;
const fs = require('fs');
const sinon = require('sinon');

const googleClient = require('../lib/googleClient');

describe('Delete Integration Test (with Attachable as Example)', function () {
    let cfg = {};
    let emitter;
    let cb;

    this.timeout(30000);

    before(() => {
        if (fs.existsSync('.env')) {
            // eslint-disable-next-line global-require
            require('dotenv').config();
        }
    });

    beforeEach(() => {
        cfg = {
            oauth: {
                access_token: process.env.ACCESS_TOKEN,
                expires_in: 3600,
                refresh_token: process.env.REFRESH_TOKEN,
                scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
                token_type: 'Bearer',
                expiry_date: 60872076819
            }
        };

        emitter = {
            emit: sinon.spy(),
        };
    });

    it('Making valid delete', async () => {
        const client = await googleClient.getAuthorizedgoogleClient(cfg);
        const sheets = google.sheets({version: 'v4', client}); //// Get spreadsheet content
        sheets.spreadsheets.values.get({
            spreadsheetId: '1f6o4Xun9VLaYqHCnTJ6b_cFlmT0xO7Lp85Fg73GBCLk',
            majorDimension: 'ROWS',
            range: 'Sheet1',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                // Print columns A and E, which correspond to indices 0 and 4.
                rows.map((row) => {
                    const rowStr = row
                        .map(v => v.length > 0 ? v : 'N/A')
                        .reduce((v1, v2) => `${v1} ${v2}`);
                    console.log(`${row.length}  ${rowStr}`)
                });
            } else {
                console.log('No data found.');
            }
        });
    });
});
