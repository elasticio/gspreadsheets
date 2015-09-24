// Spec for testing process method
// Test for metadata fetching and parsing
var events = require('events');
var _ = require('lodash-node');
var messages = require('../../../../lib/components/messages.js');
var util = require("util");

var expectedPayload = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n' +
    '\t<gsx:sku>foo</gsx:sku>\n' +
    '\t<gsx:description>&lt;xml&gt;injection&lt;/xml&gt;&lt;?DTD?&gt;</gsx:description>\n' +
    '\t<gsx:price>22</gsx:price>\n' +
    '</entry>';

function FakeEmitter() {
    events.EventEmitter.call(this);
    this.endCalled = false;
    this.on('error', function (err) {
        this.errors = this.errors || [];
        this.errors.push(err);
    });
    this.on('snapshot', function (snap) {
        this.snapshot = this.snapshot || [];
        this.snapshot.push(snap);
    });
    this.on('data', function (data) {
        this.data = this.data || [];
        this.data.push(data);
    });
    this.on('end', function () {
        this.endCalled = true;
    });
}
util.inherits(FakeEmitter, events.EventEmitter);

describe('Adding row action', function () {
    var nock = require('nock'), cfg, self;
    var verify = require('../../../../lib/components/gspreadsheets/actions/addrow.js');

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'},
            spreadsheetURL: 'https://elastic.io/foo'
        };

        self = new FakeEmitter();
    });

    it('should load successfully first time', function () {
        waitsFor(function () {
            return self.endCalled;
        });

        // Refresh token
        nock('https://accounts.google.com').
            post('/o/oauth2/token', {
                grant_type: 'refresh_token',
                client_id: 'app-id',
                client_secret: 'app-secret',
                refresh_token: 'some-refresh-token',
                format: 'json'
            }).reply(200, {
                access_token: 'access-token-2',
                refresh_token: 'refresh-token-2'
            });

        // Load spreadsheet
        nock('https://elastic.io')
            .get('/foo?alt=json&access_token=access-token-2')
            .replyWithFile(200, __dirname + '/../metadata/spreadsheet.json');

        // Load worksheet
        nock('https://spreadsheets.google.com')
            .get('/feeds/list/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/od6/private/full?alt=json&access_token=access-token-2')
            .replyWithFile(200, __dirname + '/../metadata/worksheet.json');

        // POST data
        nock('https://spreadsheets.google.com')
            .post('/feeds/list/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/od6/private/full?alt=json&access_token=access-token-2', expectedPayload)
            .reply(201);

        verify.process.call(self, messages.newMessageWithBody({
            sku: 'foo',
            bar: 'hasi',
            price: 22,
            description: '<xml>injection</xml><?DTD?>'
        }), cfg, null, {});

        runs(function () {
            expect(self.errors).toBeUndefined();
            expect(self.data.length).toEqual(1);
        });

    });

});
