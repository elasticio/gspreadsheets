// Spec for testing process method
// Test for metadata fetching and parsing
var events = require('events');
var _ = require('lodash-node');
var messages = require('elasticio-node').messages;
var util = require("util");

var expectedPayload = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n' +
    '\t<gsx:sku>foo</gsx:sku>\n' +
    '\t<gsx:description>&lt;xml&gt;injection&lt;/xml&gt;&lt;?DTD?&gt;</gsx:description>\n' +
    '\t<gsx:price>22</gsx:price>\n' +
    '</entry>';

describe('Adding row action', function () {
    var nock = require('nock'), cfg, self;
    var verify = require('../../lib/actions/addrow.js');

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'},
            spreadsheetURL: 'https://elastic.io/foo'
        };

        self = jasmine.createSpyObj('scope', ['emit']);
    });

    it('should load successfully first time', function () {

        // Refresh token
        nock('https://www.googleapis.com').
            post('/oauth2/v4/token', {
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
            .replyWithFile(200, __dirname + '/../data/spreadsheet.json');

        // Load worksheet
        nock('https://spreadsheets.google.com')
            .get('/feeds/list/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/od6/private/full?alt=json&access_token=access-token-2')
            .replyWithFile(200, __dirname + '/../data/worksheet.json');

        // POST data
        nock('https://spreadsheets.google.com')
            .post('/feeds/list/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/od6/private/full?alt=json&access_token=access-token-2', expectedPayload)
            .reply(201);

        verify.process.call(self, messages.newMessageWithBody({
            sku: 'foo',
            bar: 'hasi',
            price: 22,
            description: '<xml>injection</xml><?DTD?>'
        }), cfg, {});

        waitsFor(function () {
            return self.emit.callCount >= 3;
        });

        runs(function () {
            expect(self.emit).toHaveBeenCalled();
            expect(self.emit.callCount).toEqual(3);

            expect(self.emit.calls[0].args[0]).toEqual('updateKeys');
            expect(self.emit.calls[1].args[0]).toEqual('data');
            expect(self.emit.calls[2].args[0]).toEqual('end');

            expect(self.emit.calls[0].args[1]).toEqual({oauth: {refresh_token: 'refresh-token-2', access_token: 'access-token-2'}});
            expect(self.emit.calls[1].args[1].body).toEqual({sku: 'foo', bar: 'hasi', price: 22, description: '<xml>injection</xml><?DTD?>'});
        });

    });

});
