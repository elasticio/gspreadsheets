/* eslint-disable max-len */
const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { columnToLetter } = require('../common');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

const HEADER = 'header';
const ARRAY = 'array';
const ROWS = 'ROWS';
const COLUMNS = 'COLUMNS';

function getUpdateInputData(existingData, rowOrColumnNames, body) {
  const inputData = [];
  for (let j = 0; j < rowOrColumnNames.length; j++) {
    const newCellData = body[rowOrColumnNames[j]];
    const existingCellData = existingData[j];
    if (newCellData === null) {
      inputData.push('');
    } else if (!newCellData) {
      if (existingCellData) {
        inputData.push(existingCellData);
      } else {
        inputData.push('');
      }
    } else {
      inputData.push(newCellData);
    }
  }
  return inputData;
}

function getInsertInputData(rowOrColumnNames, body) {
  const inputData = [];
  for (let j = 0; j < rowOrColumnNames.length; j++) {
    const newCellData = body[rowOrColumnNames[j]];
    if (newCellData) {
      inputData.push(newCellData);
    } else {
      inputData.push('');
    }
  }
  return inputData;
}

function formattingResult(result) {
  let { data } = result;
  if (!data) {
    throw new Error('Result should contain \'data\' property');
  }
  if (data.updates) {
    data = { ...data, ...data.updates };
    delete data.updates;
  }
  return data;
}

function getHeaderNames(headersArray, dimension, mode) {
  if (headersArray.length < 1) {
    throw new Error('Input Mode: "First Row As Headers" requires at least one header');
  }
  const headerNames = [];
  let cellIndex = 1;
  headersArray.forEach((val) => {
    if (mode === HEADER) {
      if (!val) {
        headerNames.push('noHeader');
      } else {
        if (dimension === ROWS) {
          headerNames.push(val);
        }
        if (dimension === COLUMNS) {
          headerNames.push(val[0]);
        }
      }
    }
    if (mode === ARRAY) {
      if (dimension === ROWS) {
        const letter = columnToLetter(cellIndex);
        headerNames.push(letter);
      }
      if (dimension === COLUMNS) {
        headerNames.push(cellIndex.toString());
      }
      cellIndex++;
    }
  });
  return headerNames;
}

function getExistingCell(dimension, mode, headerNames, body, upsertCriteria, spreadsheetValues) {
  const upsertCriteriaIndex = headerNames.indexOf(upsertCriteria);
  let isCellDataPresent = 0;
  let rowOrColumnPosition;
  let startPosition = mode === HEADER ? 1 : 0;
  if (dimension === ROWS) {
    for (startPosition; startPosition < spreadsheetValues.length; startPosition++) {
      if (spreadsheetValues[startPosition][upsertCriteriaIndex] === body[upsertCriteria]) {
        isCellDataPresent++;
        rowOrColumnPosition = startPosition;
      }
    }
  }
  if (dimension === COLUMNS) {
    for (startPosition; startPosition < spreadsheetValues[0].length; startPosition++) {
      if (spreadsheetValues[upsertCriteriaIndex][startPosition] === body[upsertCriteria].toString()) {
        isCellDataPresent++;
        rowOrColumnPosition = startPosition;
      }
    }
  }
  return { isCellDataPresent, rowOrColumnPosition };
}

function getInsertRowOrColumnOpts(headerNames, dimension, body, worksheetId, spreadsheetValues) {
  const inputData = getInsertInputData(headerNames, body);
  const opts = { values: inputData };
  if (dimension === COLUMNS) {
    opts.range = `${worksheetId}!${columnToLetter(spreadsheetValues[0].length + 1)}1:${columnToLetter(spreadsheetValues[0].length + 1)}${headerNames.length}`;
  }
  return opts;
}

function getUpdateRowOrColumnOpts(worksheetId, dimension, rowOrColumnPosition, headerNames, spreadsheetValues, body) {
  let existingData;
  let range;
  if (dimension === ROWS) {
    range = `${worksheetId}!A${rowOrColumnPosition + 1}:${columnToLetter(headerNames.length)}${rowOrColumnPosition + 1}`;
    existingData = spreadsheetValues[rowOrColumnPosition];
  }
  if (dimension === COLUMNS) {
    range = `${worksheetId}!${columnToLetter(rowOrColumnPosition + 1)}1:${columnToLetter(rowOrColumnPosition + 1)}${headerNames.length}`;
    existingData = spreadsheetValues.map(val => val[rowOrColumnPosition]);
  }
  const values = getUpdateInputData(existingData, headerNames, body);
  return { range, values };
}

async function processAction(msg, cfg) {
  this.logger.info('Start action "Create/Upsert/Update Spreadsheet Row"');
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const spreadsheetData = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const spreadsheetValues = spreadsheetData.data.values;
  if (!spreadsheetValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  const { body } = msg;
  const {
    dimension, mode = HEADER, upsertCriteria, worksheetId,
  } = cfg;
  let result;
  let headersArray;
  if (dimension === ROWS) {
    // eslint-disable-next-line prefer-destructuring
    headersArray = spreadsheetValues[0];
  } else if (dimension === COLUMNS) {
    headersArray = spreadsheetValues;
  } else {
    throw new Error(` Unsupported dimension: ${dimension}`);
  }
  const headerNames = getHeaderNames(headersArray, dimension, mode);
  const { isCellDataPresent, rowOrColumnPosition } = getExistingCell(dimension, mode, headerNames, body, upsertCriteria, spreadsheetValues);
  if (isCellDataPresent > 1) {
    throw new Error('More than one rows found');
  }
  if (isCellDataPresent === 0) {
    this.logger.info('Data not found by upsert criteria, going to insert new row or column');
    const insertOpts = getInsertRowOrColumnOpts(headerNames, dimension, body, worksheetId, spreadsheetValues);
    result = await oAuth2Client.callFunction(oAuth2Client.writeToSpreadsheet, insertOpts);
  } else {
    this.logger.info('Data found by upsert criteria, going to update existing row or column');
    const updateOpts = getUpdateRowOrColumnOpts(worksheetId, dimension, rowOrColumnPosition, headerNames, spreadsheetValues, body);
    result = await oAuth2Client.callFunction(oAuth2Client.updateSpreadsheetRow, updateOpts);
  }
  const quotaManager = new QuotaManager(cfg);
  await quotaManager.rateLimit();
  const formattedResult = formattingResult(result);
  this.logger.info('Message successfully processed, going to emit data');
  return messages.newMessageWithBody(formattedResult);
}

function getHeaderSelectModel(headersArray) {
  if (headersArray.length < 1) {
    throw new Error('Input Mode: "First Row As Headers" requires at least one header');
  }
  const selectModel = {};
  let emptyHeader = 0;
  headersArray.forEach((header) => {
    if (!header) {
      emptyHeader++;
      if (emptyHeader > 1) {
        throw new Error('Input Mode: "First Row As Headers" requires at most one cell in the header row can be empty.');
      }
      selectModel.noHeader = 'no header';
    } else {
      selectModel[header] = header;
    }
  });
  return selectModel;
}

async function getUpsertCriteria(cfg) {
  const { dimension, mode = HEADER } = cfg;
  let selectModel = {};
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const spreadsheetData = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const spreadsheetValues = spreadsheetData.data.values;
  if (!spreadsheetValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  this.logger.debug('Starting to get upsert criteria for dimension: %s and mode: %s', dimension, mode);
  if (dimension === ROWS) {
    const firstRow = spreadsheetValues[0];
    if (mode === HEADER) {
      selectModel = getHeaderSelectModel(firstRow);
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstRow.length + 1; i++) {
        const letter = columnToLetter(i);
        selectModel[letter] = letter;
      }
    }
  } else if (dimension === COLUMNS) {
    const firstColumn = [];
    spreadsheetValues.forEach((val) => {
      firstColumn.push(val[0]);
    });
    if (mode === HEADER) {
      selectModel = getHeaderSelectModel(firstColumn);
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstColumn.length + 1; i++) {
        selectModel[i] = i;
      }
    }
  } else {
    throw new Error(` Unsupported dimension: ${dimension}`);
  }
  return selectModel;
}

async function getMetaModel(cfg) {
  this.logger.info('Start generating metadata');
  const out = {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        required: true,
      },
      tableRange: {
        type: 'string',
        required: true,
      },
      updatedRange: {
        type: 'string',
        required: true,
      },
      updatedRows: {
        type: 'numeric',
        required: true,
      },
      updatedColumns: {
        type: 'numeric',
        required: true,
      },
      updatedCells: {
        type: 'numeric',
        required: true,
      },
    },
  };
  const input = {
    type: 'object',
    properties: {
    },
  };
  const { dimension, mode = HEADER, upsertCriteria } = cfg;
  this.logger.debug('Start generating metadata for dimension: %s and mode: %s and upsertCriteria: %s', dimension, mode, upsertCriteria);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const spreadsheetData = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const spreadsheetValues = spreadsheetData.data.values;
  if (!spreadsheetValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  let rowNames = [];
  if (dimension === ROWS) {
    const firstRow = spreadsheetValues[0];
    if (mode === HEADER) {
      rowNames = firstRow;
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstRow.length + 1; i++) {
        const letter = columnToLetter(i);
        rowNames.push(letter);
      }
    }
  } else if (dimension === COLUMNS) {
    const firstColumn = [];
    spreadsheetValues.forEach((val) => {
      firstColumn.push(val[0]);
    });
    if (mode === HEADER) {
      rowNames = firstColumn;
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstColumn.length + 1; i++) {
        rowNames.push(i);
      }
    }
  } else {
    throw new Error(` Unsupported dimension: ${dimension}`);
  }

  if (rowNames.length < 1) {
    throw new Error('Input Mode: "First Row As Headers" requires at least one header');
  }

  rowNames.forEach((rowName) => {
    let emptyHeader = 0;
    if (!rowName) {
      emptyHeader++;
      if (emptyHeader > 1) {
        this.logger.error('Found several cells with empty value in header row');
        throw new Error('Input Mode: "First Row As Headers" requires at most one cell in first row to be empty');
      }
      if (input.properties.noHeader !== undefined) {
        throw new Error('Input Mode: "First Row As Headers" requires at most one cell with empty header');
      }
      input.properties.noHeader = {
        title: 'no header',
        description: 'cell without header',
        type: 'string',
        required: upsertCriteria === 'noHeader',
      };
    } else {
      if (input.properties[rowName] !== undefined) {
        throw new Error('Input Mode: "First Row As Headers" requires cells in first row to be unique. Check: Common Errors section in docs.');
      }
      input.properties[rowName.toString().split(' ').join('')] = {
        title: rowName,
        description: rowName,
        type: 'string',
        required: rowName.toString() === upsertCriteria,
      };
    }
  });
  const result = {
    out,
    in: input,
  };
  this.logger.info('Finish generating metadata');
  return result;
}

module.exports.process = processAction;
module.exports.listSpreadsheets = listSpreadsheets;
module.exports.listWorksheets = listWorksheets;
module.exports.getMetaModel = getMetaModel;
module.exports.getUpsertCriteria = getUpsertCriteria;
