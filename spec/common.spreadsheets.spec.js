describe('Common function listSpreadsheets', function () {
    var nock = require('nock'), cfg, cb;
    var common = require('../lib/common.js');
    var that;

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'}
        };

        cb = jasmine.createSpy('cb');
        that = jasmine.createSpyObj('scope', ['emit']);
    });

    it('Should provide message if no credentials is set', function () {

        common.listSpreadsheets.call(that, {}, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0]).toEqual('Missing oauth access token');
        });
    });

    it('should react on auth errors when refreshing token', function () {

        // Refresh token
        nock('https://www.googleapis.com').
            post('/oauth2/v4/token', {
                grant_type: 'refresh_token',
                client_id: 'app-id',
                client_secret: 'app-secret',
                refresh_token: 'some-refresh-token',
                format: 'json'
            }).reply(500, "Server error");

        common.listSpreadsheets.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0].message).toEqual('Unexpected return code 500, expected 200, body Server error');
            expect(cb.calls[0].args[0]).toEqual({ responseBody : 'Server error', statusCode : 500 });
        });
    });

    it('should react on errors when fetching resource', function () {

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

        // List all spreadsheets
        nock('https://spreadsheets.google.com')
            .get('/feeds/spreadsheets/private/full?alt=json&access_token=access-token-2')
            .reply(500, 'Server error');

        common.listSpreadsheets.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0].message).toEqual('HTTP request failed with code 500');
            expect(cb.calls[0].args[0].response.status).toEqual(500);
        });
    });

    it('should list spreadsheets', function () {

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

        // List all spreadsheets
        nock('https://spreadsheets.google.com')
            .get('/feeds/spreadsheets/private/full?alt=json&access_token=access-token-2')
            .replyWithFile(200, __dirname + '/data/response.json');

        common.listSpreadsheets.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0]).toEqual(null);
            var result = cb.calls[0].args[1];
            // Four spreadsheets
            expect(Object.keys(result).length).toEqual(4);
            expect(Object.keys(result)[0]).toEqual("https://spreadsheets.google.com/feeds/worksheets/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/private/full");
            expect(result[Object.keys(result)[0]]).toEqual("Debitoor Product Sample");
        });
    });
});
