describe('Common function listSpreadsheets', function () {
    var nock = require('nock'), cfg, cb;
    var common;
    var that;

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'}
        };

        cb = jasmine.createSpy('cb');
        that = jasmine.createSpyObj('scope', ['emit']);
        common = require('../lib/common.js');
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
        nock('https://accounts.google.com/').post('/o/oauth2/token', {
            grant_type: 'refresh_token',
            client_id: 'app-id',
            client_secret: 'app-secret',
            refresh_token: 'some-refresh-token'
        }).reply(500, "Server error");

        common.listSpreadsheets.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0].message).toEqual('Server error');
            expect(cb.calls[0].args[0]).toEqual({code: 500});
        });
    });

    it('should react on errors when fetching resource', function () {

        // Refresh token
        nock('https://accounts.google.com/').post('/o/oauth2/token', {
            grant_type: 'refresh_token',
            client_id: 'app-id',
            client_secret: 'app-secret',
            refresh_token: 'some-refresh-token'
        }).reply(200, {
            access_token: 'access-token-2',
            refresh_token: 'refresh-token-2'
        });

        // List all spreadsheets
        nock('https://www.googleapis.com')
            .get('/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&pageSize=1000')
            .reply(500, 'Server error');

        common.listSpreadsheets.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0].message).toEqual('Server error');
            expect(cb.calls[0].args[0].code).toEqual(500);
        });
    });

    it('should list spreadsheets', function () {

        // Refresh token
        nock('https://accounts.google.com/').post('/o/oauth2/token', {
            grant_type: 'refresh_token',
            client_id: 'app-id',
            client_secret: 'app-secret',
            refresh_token: 'some-refresh-token'
        }).reply(200, {
            access_token: 'access-token-2',
            refresh_token: 'refresh-token-2'
        });

        // List all spreadsheets
        nock('https://www.googleapis.com')
            .get('/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&pageSize=1000')
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
            expect(Object.keys(result).length).toEqual(2);
            expect(Object.keys(result)[0]).toEqual("one");
            expect(result[Object.keys(result)[0]]).toEqual("One");
        });
    });
});
