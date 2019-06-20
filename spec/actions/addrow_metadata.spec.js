/* eslint-disable */

// Test for metadata fetching and parsing
describe('Metadata for add new row ', function () {
    var nock = require('nock'), cfg, cb, self;
    var addrow = require('../../lib/actions/addrow.js');

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'},
            spreadsheetURL : 'https://elastic.io/foo'
        };

        cb = jasmine.createSpy('cb');
        self = jasmine.createSpyObj('scope', ['emit']);
    });

    it('should load successfully', function () {

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

        addrow.getMetaModel.call(self, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0]).toEqual(null);
            var metadata = cb.calls[0].args[1];
            expect(metadata.in).toBeDefined();
            expect(metadata.out).toBeDefined();
            expect(metadata.in).toEqual(metadata.out);
            expect(metadata.out.properties).toBeDefined();
            expect(metadata.out.properties.sku).toBeDefined();
            expect(metadata.out.properties.name).toBeDefined();
            expect(metadata.out.properties.description).toBeDefined();
            expect(metadata.out.properties.price).toBeDefined();

            expect(self.emit).toHaveBeenCalled();
            expect(self.emit.callCount).toEqual(1);
            expect(self.emit.calls[0].args[0]).toEqual('updateKeys');
            expect(self.emit.calls[0].args[1]).toEqual({oauth : {refresh_token: 'refresh-token-2', access_token: 'access-token-2'}});
        });
    });
});
