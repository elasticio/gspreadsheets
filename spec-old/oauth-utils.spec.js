describe('OAuth Utils', () => {
  const utils = require('../lib/oauth-utils.js');
  const request = require('request');

  process.env.GOOGLE_APP_ID = 'app-id';
  process.env.GOOGLE_APP_SECRET = 'app-secret';

  let cfg; let
    expectedOpts;

  beforeEach(() => {
    cfg = {
      oauth: {
        access_token: '1111111111111111',
        refresh_token: '2222222222222222',
        expires_in: 3600,
        token_type: 'Bearer',
      },
      prodEnv: 'login',
    };

    expectedOpts = {
      url: 'https://www.googleapis.com/oauth2/v4/token',
      agent: false,
      headers: {},
      form: {
        grant_type: 'refresh_token',
        client_id: 'app-id',
        client_secret: 'app-secret',
        refresh_token: '2222222222222222',
        format: 'json',
      },
      json: undefined,
    };
  });

  afterEach(() => {
    expect(request.post).toHaveBeenCalledWith(expectedOpts, jasmine.any(Function));
  });

  it('Refresh access_token', () => {
    const serverResponse = {
      access_token: '33333333333333333',
    };

    spyOn(request, 'post').andCallFake((options, callback) => {
      callback(null, { statusCode: 200 }, JSON.stringify(serverResponse));
    });

    let result = false;

    runs(() => {
      utils.refreshAppToken('salesforce', cfg, (err, data) => {
        result = { err, data };
      });
    });

    waitsFor(() => result);

    runs(() => {
      expect(result.err).toBeNull();
      expect(result.data).toEqual({
        oauth: {
          access_token: '33333333333333333',
          refresh_token: '2222222222222222',
          expires_in: 3600,
          token_type: 'Bearer',
        },
        prodEnv: 'login',
      });
    });
  });

  it('Refresh access_token and refresh_token if server returns both', () => {
    const serverResponse = {
      access_token: '33333333333333333',
      refresh_token: '44444444444444444',
    };

    spyOn(request, 'post').andCallFake((options, callback) => {
      callback(null, { statusCode: 200 }, JSON.stringify(serverResponse));
    });

    let result = false;

    runs(() => {
      utils.refreshAppToken('salesforce', cfg, (err, data) => {
        result = { err, data };
      });
    });

    waitsFor(() => result);

    runs(() => {
      expect(result.err).toBeNull();
      expect(result.data).toEqual({
        oauth: {
          access_token: '33333333333333333',
          refresh_token: '44444444444444444',
          expires_in: 3600,
          token_type: 'Bearer',
        },
        prodEnv: 'login',
      });
    });
  });
});
