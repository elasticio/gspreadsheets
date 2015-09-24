describe('OAuth Utils', function () {

    var utils = require('../../lib/components/oauth-utils.js');
    var request = require("request");

    process.env.SALESFORCE_KEY = "aSalesforceKey";
    process.env.SALESFORCE_SECRET = "aSalesforceSecret";

    var cfg, expectedOpts;

    beforeEach(function(){
        cfg = {
            oauth: {
                "access_token" : "1111111111111111",
                "refresh_token" : "2222222222222222",
                "expires_in" : 3600,
                "token_type" : "Bearer"
            },
            prodEnv : 'login'
        };

       expectedOpts = {
            url : 'https://login.salesforce.com/services/oauth2/token',
            agent: false,
            headers : {},
            form : {
                grant_type : 'refresh_token',
                client_id : 'aSalesforceKey',
                client_secret : 'aSalesforceSecret',
                refresh_token : "2222222222222222",
                format : 'json'
            },
            json : undefined
        };
    });

    afterEach(function(){
        expect(request.post).toHaveBeenCalledWith(expectedOpts, jasmine.any(Function));
    });

    it('Refresh access_token', function () {

        var serverResponse = {
            "access_token" : "33333333333333333"
        };

        spyOn(request, 'post').andCallFake(function (options, callback) {
            callback(null, {statusCode: 200}, JSON.stringify(serverResponse));
        });

        var result = false;

        runs(function(){
            utils.refreshAppToken('salesforce', cfg, function(err, data) {
                result = {err: err, data: data};
            });
        });

        waitsFor(function(){
            return result;
        });

        runs(function(){
            expect(result.err).toBeNull();
            expect(result.data).toEqual({
                oauth: {
                    "access_token" : "33333333333333333",
                    "refresh_token" : "2222222222222222",
                    "expires_in" : 3600,
                    "token_type" : "Bearer"
                },
                prodEnv : 'login'
            });
        });
    });

    it('Refresh access_token and refresh_token if server returns both', function () {

        var serverResponse = {
            "access_token" : "33333333333333333",
            "refresh_token" : "44444444444444444"
        };

        spyOn(request, 'post').andCallFake(function (options, callback) {
            callback(null, {statusCode: 200}, JSON.stringify(serverResponse));
        });

        var result = false;

        runs(function(){
            utils.refreshAppToken('salesforce', cfg, function(err, data) {
                result = {err: err, data: data};
            });
        });

        waitsFor(function(){
            return result;
        });

        runs(function(){
            expect(result.err).toBeNull();
            expect(result.data).toEqual({
                oauth: {
                    "access_token" : "33333333333333333",
                    "refresh_token" : "44444444444444444",
                    "expires_in" : 3600,
                    "token_type" : "Bearer"
                },
                prodEnv : 'login'
            });
        });
    });
});