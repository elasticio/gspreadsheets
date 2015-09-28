var events = require('events');
var _ = require('lodash-node');
var util = require("util");

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

describe('List available google spreadsheets', function () {
    var nock = require('nock'), cfg, self;
    var verify = require('../../lib/triggers/rows');

    beforeEach(function () {
        process.env.GOOGLE_APP_ID = 'app-id';
        process.env.GOOGLE_APP_SECRET = 'app-secret';
        cfg = {
            oauth: {refresh_token: 'some-refresh-token', access_token: 'some-access-id'},
            spreadsheetURL: 'https://elastic.io/foo'
        };

        self = new FakeEmitter();
    });

    it('Should provide message if no spreadsheet URL is set', function () {

        delete cfg.spreadsheetURL;

        verify.process.call(self, {}, cfg, {});

        waitsFor(function () {
            return self.endCalled;
        });

        runs(function () {
            expect(self.errors.length).toEqual(1);
            expect(self.errors[0]).toEqual('Spreadsheet URL should be set in configuration');
        });
    });

    it('should load successfully first time', function () {

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

        verify.process.call(self, {}, cfg, {});

        waitsFor(function () {
            return self.endCalled;
        });

        runs(function () {
            expect(self.errors).toBeUndefined();
            expect(self.snapshot.length).toEqual(1);
            expect(self.snapshot[0]).toEqual({
                rows: ['d313f058', '751d59a2', '7ff46ada', '5c71c00e'],
                lastUpdate: 1424456602727
            });
            expect(self.data.length).toEqual(4);
            expect(_.pluck(_.pluck(self.data, 'body'), 'rowIndex')).toEqual([0, 1, 2, 3]);
            expect(_.pluck(_.pluck(self.data, 'body'), 'description')).toEqual(['Mehl vollkorn', 'Fetttarme Milch', 'Sehr lecker', 'Weinachtsstimmung vorbei']);
            expect(_.pluck(_.pluck(self.data, 'body'), 'sku')).toEqual(['one', 'two', 'three', 'four']);
        });

    });

    it('should see if there any changes', function () {

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

        verify.process.call(self, {}, cfg, {
            rows: ['d313f058', '751d59a2', '7ff46ada', '5c71c00e'],
            lastUpdate: 1424456602727
        });

        waitsFor(function () {
            return self.endCalled;
        });

        runs(function () {
            expect(self.errors).toBeUndefined();
            expect(self.snapshot.length).toEqual(1);
            expect(self.snapshot[0]).toEqual({
                rows: ['d313f058', '751d59a2', '7ff46ada', '5c71c00e'],
                lastUpdate: 1424456602727
            });
            expect(self.data).toBeUndefined();
        });

    });

    it('should detect changed rows', function () {

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

        verify.process.call(self, {}, cfg, {
            rows: ['d313f058', '751d59a2', 'updated!', '5c71c00e'],
            lastUpdate: 1424456602721
        });

        waitsFor(function () {
            return self.endCalled;
        });

        runs(function () {
            expect(self.errors).toBeUndefined();
            expect(self.snapshot.length).toEqual(1);
            expect(self.snapshot[0]).toEqual({
                rows: ['d313f058', '751d59a2', '7ff46ada', '5c71c00e'],
                lastUpdate: 1424456602727
            });
            expect(self.data.length).toEqual(1);
            expect(self.data[0].body).toEqual({
                rowIndex: 2,
                sku: 'three',
                name: 'Schokolade',
                description: 'Sehr lecker',
                price: '30,5',
                foo: 'asd'
            });
        });
    });
});
