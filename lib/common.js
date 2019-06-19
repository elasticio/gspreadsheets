const _ = require('lodash-node');
const http = require('q-io/http');
const util = require('util');
const Q = require('q');
const oAuthUtils = require('./oauth-utils.js');

/**
 * This method append an access_token to URL
 *
 * @param url
 * @param conf
 * @returns {*}
 */
function appendParams(url, conf) {
  return url
    + util.format('?alt=json&access_token=%s', conf.oauth.access_token);
}

/**
 * This functions returns a promise that will fetch workbook
 * from he worksheet URL in configuration.
 * It expects a ```cfg.oauth``` and ```cfg.spreadsheetURL``` to be set
 *
 * Promise will fulfill with the feed of the worksheet
 *
 * @param cfg
 */
function fetchWorkbook(cfg) {
  const that = this;
  const defered = Q.defer();
  const { spreadsheetURL } = cfg;
  let newCfg;

  if (!spreadsheetURL) {
    defered.reject('Spreadsheet URL should be set in configuration');
    return defered.promise;
  }

  function applyNewCfg(updatedCfg) {
    newCfg = updatedCfg;
    that.emit('updateKeys', { oauth: updatedCfg.oauth });
    console.log('Refreshed token, received new keys');
  }

  function fetchSpreadsheet() {
    console.log('Fetching spreadsheet url=%s', spreadsheetURL);
    return http.read(appendParams(spreadsheetURL, newCfg));
  }

  function findAndFetchWorksheet(body) {
    // Now select first worksheet in the spreadsheet
    const response = JSON.parse(body.toString('utf-8'));
    if (!response.feed) {
      throw new Error('Feed is empty');
    }
    const first = _.first(response.feed.entry);
    // eslint-disable-next-line no-shadow
    const link = _.find(first.link, link => link.rel.indexOf('listfeed') >= 0);
    if (!link) {
      throw new Error(
        `Can not find a link rel #listfeed in ${JSON.stringify(first)}`,
      );
    }
    const worksheetUrl = link.href;
    console.log('Fetching worksheet url=%s', worksheetUrl);
    return http.read(appendParams(worksheetUrl, newCfg));
  }

  function complete(body) {
    const response = JSON.parse(body.toString('utf-8'));
    const { feed } = response;
    defered.fulfill([feed, newCfg]);
  }

  oAuthUtils.refreshTokenPromise('gspreadsheets', cfg)
    .then(applyNewCfg)
    .then(fetchSpreadsheet)
    .then(findAndFetchWorksheet)
    .then(complete)
    .fail((err) => {
      console.error(err.stack || err);
      defered.reject(err);
    })
    .done();

  return defered.promise;
}

/**
 * This function returns a list of all spreadsheets available by given account in a format
 *
 * {
 *    "https://spreadsheets.google.com/feeds/worksheets/1DLLZwg5xanRY/private/full"
 *       : "Debitoor Product Sample"
 * }
 *
 * @param cfg
 * @param cb
 */
// eslint-disable-next-line consistent-return
function listSpreadsheets(cfg, cb) {
  const listAllURL = 'https://spreadsheets.google.com/feeds/spreadsheets/private/full';
  const that = this;

  if (!cfg.oauth) {
    return cb('Missing oauth access token');
  }

  function onTokenReceived(conf) {
    that.emit('updateKeys', { oauth: conf.oauth });
    return http.read(appendParams(listAllURL, conf));
  }

  function onSuccess(body) {
    const result = {};
    const response = JSON.parse(body.toString('utf-8'));
    if (!response.feed || !response.feed.entry) {
      throw new Error('Returned feed is empty');
    }
    // eslint-disable-next-line array-callback-return
    response.feed.entry.map((entry) => {
      const link = _.find(entry.link,
        // eslint-disable-next-line no-shadow
        link => link.rel.indexOf('schemas.google.com/spreadsheets') >= 0);
      result[link.href] = entry.title.$t;
    });
    cb(null, result);
  }

  function onError(err) {
    console.error(err.stack || err);
    cb(err);
  }

  oAuthUtils.refreshTokenPromise('gspreadsheets', cfg)
    .then(onTokenReceived)
    .then(onSuccess)
    .fail(onError)
    .done();
}

/**
 * This function extract values out of typical representation of the worksheet cell
 *
 * row is something like
 * {
 *    foo : 'bar',
 *    hasi : 'zoo',
 *    xxx$foo : 'baz'
 * }
 *
 * nsholder is where namespaces are stored, e.g.
 *
 * {
 *      xmlns$xxx : 'asdf'
 * }
 *
 * and callback will be called with 'foo' and 'baz' values
 *
 * @param row
 * @param callback
 */
function extractCellValues(row, nsholder, callback) {
  function extractCellValue(key) {
    // Keys that we need are called xxx$foo
    // where xxx is a namespace prefix we need to check
    const attr = key.split('$');
    if (attr.length === 2) {
      const npref = attr[0];
      const field = attr[1];
      const ns = nsholder[`xmlns$${npref}`];
      if (ns === 'http://schemas.google.com/spreadsheets/2006/extended') {
        callback(field, row[key].$t);
      }
    }
  }

  _.keys(row).forEach(extractCellValue);
}

/**
 * This function returns a metadata based on the incoming configuration. Incoming configuration
 * should contain a field 'spreadsheetURL' that contains a URL of the spreadsheet
 *
 * It takes a first worksheet from the spreadsheet and fetches metadata from it
 *
 * @param cfg
 * @param cb
 */
function getMetaModel(cfg, cb) {
  function onSuccess(feed) {
    const firstRow = _.first(feed.entry);
    const metadata = {
      in: {}, // Empty as we are in trigger
      out: {
        type: 'object',
        properties: {
          rowIndex: {
            title: 'Row Number',
            type: 'number',
            required: true,
          },
          // Other properties will be filled later
        },
      },
    };
    extractCellValues(firstRow, feed, (field) => {
      metadata.out.properties[field] = {
        type: 'string',
      };
    });
    cb(null, metadata);
  }

  function onError(err) {
    console.error(err.stack || err);
    cb(err);
  }

  fetchWorkbook.call(this, cfg)
    .spread(onSuccess)
    .fail(onError)
    .done();
}

function columnToLetter(column) {
  let temp;
  let
    letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    // eslint-disable-next-line no-param-reassign
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// eslint-disable-next-line no-unused-vars
function letterToColumn(letter) {
  let column = 0;
  const
    { length } = letter;
  for (let i = 0; i < length; i += 1) {
    column += (letter.charCodeAt(i) - 64) * (26 ** (length - i - 1));
  }
  return column;
}

function transformToOutputStructure(dimension, values, includeHeader) {
  let headers;
  if (includeHeader) {
    [headers] = values;
    // eslint-disable-next-line no-param-reassign
    values = values.slice(1);
  }
  const result = values.reduce((accumulator, currentValue) => {
    accumulator.push(
      currentValue.reduce((accumulator2, currentValue2, index2) => {
        let key;
        if (includeHeader) {
          key = headers[index2];
        } else if (dimension === 'ROWS') {
          key = columnToLetter(index2 + 1);
        } else {
          key = index2 + 1;
        }
        // eslint-disable-next-line no-param-reassign
        accumulator2[key] = currentValue2;
        return accumulator2;
      }, {}),
    );
    return accumulator;
  }, []);
  return result;
}

exports.listSpreadsheets = listSpreadsheets;
exports.getMetaModel = getMetaModel;
exports.fetchWorkbook = fetchWorkbook;
exports.extractCellValues = extractCellValues;
exports.transformToOutputStructure = transformToOutputStructure;
