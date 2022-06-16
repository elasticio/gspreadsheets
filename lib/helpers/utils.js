const axios = require('axios');
const { URL } = require('url');
const path = require('path');

const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 10000; // 10s
const REQUEST_MAX_RETRY = process.env.REQUEST_MAX_RETRY || 3;
const REQUEST_RETRY_DELAY = process.env.REQUEST_RETRY_DELAY || 5000; // 5s

function addRetryCountInterceptorToAxios(ax) {
  ax.interceptors.response.use(undefined, (err) => { //  Retry count interceptor for axios
    const { config } = err;
    if (!config || !config.retry || !config.delay) { return Promise.reject(err); }
    config.currentRetryCount = config.currentRetryCount || 0;
    if (config.currentRetryCount >= config.retry) {
      return Promise.reject(err);
    }
    config.currentRetryCount += 1;
    return new Promise(resolve => setTimeout(() => resolve(ax(config)), config.delay));
  });
}

function getSecretUri(secretId, isRefresh) {
  const parsedUrl = new URL(process.env.ELASTICIO_API_URI);
  parsedUrl.username = process.env.ELASTICIO_API_USERNAME;
  parsedUrl.password = process.env.ELASTICIO_API_KEY;
  parsedUrl.pathname = path.join(
    parsedUrl.pathname || '/',
    'v2/workspaces/',
    process.env.ELASTICIO_WORKSPACE_ID,
    'secrets',
    String(secretId),
    isRefresh ? 'refresh' : '',
  );
  return parsedUrl.toString();
}

module.exports.getSecret = async (emitter, secretId, fullSecret) => {
  const secretUri = getSecretUri(secretId);
  emitter.logger.info('Going to fetch secret');
  const ax = axios.create();
  addRetryCountInterceptorToAxios(ax);
  const secret = await ax.get(secretUri, {
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
  });
  emitter.logger.info('Got secret');
  if (fullSecret) {
    return secret.data.data;
  }
  return secret.data.data.attributes;
};

module.exports.refreshToken = async (emitter, secretId) => {
  const secretUri = getSecretUri(secretId, true);
  emitter.logger.info('going to refresh secret');
  const ax = axios.create();
  addRetryCountInterceptorToAxios(ax);
  const secret = await ax.post(secretUri, {}, {
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
  });
  const token = secret.data.data.attributes.credentials;
  emitter.logger.info('Token refreshed');
  return token;
};

module.exports.getRetriesFromConfig = (cfg) => {
  let retries;
  switch (cfg.retries) {
    case 'one':
      retries = 1;
      break;
    case 'two':
      retries = 2;
      break;
    case 'three':
      retries = 3;
      break;
    case 'four':
      retries = 4;
      break;
    case 'five':
      retries = 5;
      break;
    case 'six':
      retries = 6;
      break;
    case 'seven':
      retries = 7;
      break;
    case 'eight':
      retries = 8;
      break;
    default:
      retries = 5;
  }
  return retries;
};
