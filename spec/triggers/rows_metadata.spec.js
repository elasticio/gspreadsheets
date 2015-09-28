describe('List available google spreadsheets', function () {

    var nock = require('nock'), cfg, cb, that;
    var verify = require('../../lib/triggers/rows');

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'},
            spreadsheetURL : 'https://elastic.io/foo'
        };

        cb = jasmine.createSpy('cb');
        that = jasmine.createSpyObj('scope', ['emit']);
    });

    it('Should provide message if no spreadsheet URL is set', function () {

        delete cfg.spreadsheetURL;

        verify.getMetaModel.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0]).toEqual('Spreadsheet URL should be set in configuration');
        });
    });

    it('should react on worksheet load failure', function () {

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
            .replyWithFile(200, __dirname + '/../data/spreadsheet.json');

        // Load worksheet
        var scope3 = nock('https://spreadsheets.google.com')
            .get('/feeds/list/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/od6/private/full?alt=json&access_token=access-token-2')
            .reply(302, 'Authentication failed');

        runs(function () {
            verify.getMetaModel.call(that, cfg, cb);
        });

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0].message).toEqual('HTTP request failed with code 302');
            expect(cb.calls[0].args[0].response.status).toEqual(302);
        });

    });

    it('should load successfully', function () {

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
            .replyWithFile(200, __dirname + '/../data/spreadsheet.json');

        // Load worksheet
        nock('https://spreadsheets.google.com')
            .get('/feeds/list/1DLLZwg5xanRYNQBF5VkN5tIIVsyvw6MUljm6P0rJiJc/od6/private/full?alt=json&access_token=access-token-2')
            .replyWithFile(200, __dirname + '/../data/worksheet.json');

        verify.getMetaModel.call(that, cfg, cb);

        waitsFor(function () {
            return cb.callCount;
        });

        runs(function () {
            expect(cb).toHaveBeenCalled();
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls.length).toEqual(1);
            expect(cb.calls[0].args[0]).toEqual(null);
            var metadata = cb.calls[0].args[1];
            expect(metadata.in).toBeDefined();
            expect(metadata.out).toBeDefined();
            expect(metadata.out.properties).toBeDefined();
            expect(metadata.out.properties.rowIndex).toBeDefined();
            expect(metadata.out.properties.sku).toBeDefined();
            expect(metadata.out.properties.name).toBeDefined();
            expect(metadata.out.properties.description).toBeDefined();
            expect(metadata.out.properties.price).toBeDefined();
        });

    });

});
