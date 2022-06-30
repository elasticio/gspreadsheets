const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { columnToLetter } = require('../common');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

const HEADER = 'header';
const ARRAY = 'array';

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

async function processAction(msg, cfg) {
  this.logger.info('Start action "Create/Upsert/Update Spreadsheet Row"');
  this.logger.info('msg %j, cfg %j', msg, cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const spreadsheetData = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const spreadsheetValues = spreadsheetData.data.values;
  if (!spreadsheetValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  const { body } = msg;
  const { dimension, mode = HEADER, upsertCriteria } = cfg;
  let result;
  if (dimension === 'ROWS') {
    const columnNames = [];
    let i = 0;
    if (mode === HEADER) {
      spreadsheetValues[0].forEach((item) => {
        if (item === '' || item === undefined || item === null) {
          columnNames.push('noHeader');
        } else {
          columnNames.push(item);
        }
      });
      i = 1;
    }
    if (mode === ARRAY) {
      for (let j = 0; j < spreadsheetValues[0].length; j++) {
        const letter = columnToLetter(j + 1);
        columnNames.push(letter);
      }
    }
    const upsertCriteriaIndex = columnNames.indexOf(upsertCriteria);
    let isRowDataPresent = 0;
    let rowPosition;
    for (i; i < spreadsheetValues.length; i++) {
      if (spreadsheetValues[i][upsertCriteriaIndex] === body[upsertCriteria]) {
        isRowDataPresent++;
        rowPosition = i;
      }
    }
    if (isRowDataPresent > 1) {
      throw new Error('More than one rows found');
    }
    if (isRowDataPresent === 0) {
      this.logger.info('Data not found by upsert criteria, going to insert new row');
      const inputData = getInsertInputData(columnNames, body);
      result = await oAuth2Client.callFunction(oAuth2Client.writeToSpreadsheet, inputData);
    } else {
      this.logger.info('Data found by upsert criteria, going to update existing row');
      const range = `${cfg.worksheetId}!A${rowPosition + 1}:${columnToLetter(columnNames.length)}${rowPosition + 1}`;
      this.logger.debug('Calculated range: %s', range);
      const inputData = getUpdateInputData(spreadsheetValues[rowPosition], columnNames, body);
      // eslint-disable-next-line max-len
      result = await oAuth2Client.callFunction(oAuth2Client.updateSpreadsheetRow, { range, values: inputData });
    }
  } else if (dimension === 'COLUMNS') {
    const rowNames = [];
    let i = 0;
    if (mode === HEADER) {
      spreadsheetValues.forEach((val) => {
        if (val === '' || val === undefined || val === null) {
          rowNames.push('noHeader');
        } else {
          rowNames.push(val[0]);
        }
      });
      i = 1;
    }
    if (mode === ARRAY) {
      for (let j = 1; j < spreadsheetValues.length + 1; j++) {
        rowNames.push(j.toString());
      }
      i = 0;
    }
    const upsertCriteriaIndex = rowNames.indexOf(upsertCriteria);
    let isColumnDataPresent = 0;
    let columnPosition;
    for (i; i < spreadsheetValues[0].length; i++) {
      if (spreadsheetValues[upsertCriteriaIndex][i] === body[upsertCriteria].toString()) {
        isColumnDataPresent++;
        columnPosition = i;
      }
    }
    if (isColumnDataPresent > 1) {
      throw new Error('More than one rows found');
    }
    if (isColumnDataPresent === 0) {
      this.logger.info('Data not found by upsert criteria, going to insert new column');
      const inputData = getInsertInputData(rowNames, body);
      const range = `${cfg.worksheetId}!${columnToLetter(spreadsheetValues[0].length + 1)}1:${columnToLetter(spreadsheetValues[0].length + 1)}${rowNames.length}`;
      this.logger.debug('Calculated range: %s', range);
      // eslint-disable-next-line max-len
      result = await oAuth2Client.callFunction(oAuth2Client.writeColumnToSpreadsheet, { range, values: inputData });
    } else {
      this.logger.info('Data found by upsert criteria, going to update existing column');
      const range = `${cfg.worksheetId}!${columnToLetter(columnPosition + 1)}1:${columnToLetter(columnPosition + 1)}${rowNames.length}`;
      this.logger.debug('Calculated range: %s', range);
      const existingData = spreadsheetValues.map(val => val[columnPosition]);
      const inputData = getUpdateInputData(existingData, rowNames, body);
      // eslint-disable-next-line max-len
      result = await oAuth2Client.callFunction(oAuth2Client.updateSpreadsheetColumn, {
        range,
        values: inputData,
      });
    }
  } else {
    throw new Error(` Unsupported dimension: ${dimension}`);
  }
  const quotaManager = new QuotaManager(cfg);
  await quotaManager.rateLimit();
  const formattedResult = formattingResult(result);
  this.logger.info('Message successfully processed, going to emit data');
  return messages.newMessageWithBody(formattedResult);
}

async function getUpsertCriteria(cfg) {
  const { dimension, mode = HEADER } = cfg;
  const selectModel = {};
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const spreadsheetData = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const spreadsheetValues = spreadsheetData.data.values;
  if (!spreadsheetValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  this.logger.debug('Starting to get upsert criteria for dimension: %s and mode: %s', dimension, mode);
  if (dimension === 'ROWS') {
    const firstRow = spreadsheetValues[0];
    if (mode === HEADER) {
      let emptyHeader = 0;
      firstRow.forEach((row) => {
        if (row === '' || row === undefined || row === null) {
          emptyHeader++;
          if (emptyHeader > 1) {
            this.logger.error('Found several empty cell in the header. At most one cell in the header row can be empty');
            throw new Error('Input Mode: "First Row As Headers" requires at most one cell in the header row can be empty.');
          }
          selectModel.noHeader = 'no header';
        } else {
          selectModel[row] = row;
        }
      });
    }
    if (mode === ARRAY) {
      for (let i = 1; i < firstRow.length + 1; i++) {
        const letter = columnToLetter(i);
        selectModel[letter] = letter;
      }
    }
  } else if (dimension === 'COLUMNS') {
    const firstColumn = [];
    spreadsheetValues.forEach((val) => {
      firstColumn.push(val[0]);
    });
    if (mode === HEADER || mode === undefined) {
      let emptyHeader = 0;
      firstColumn.forEach((column) => {
        if (column === '' || column === undefined || column === null) {
          emptyHeader++;
          if (emptyHeader > 1) {
            this.logger.error('Found several empty cell in the header. At most one cell in the header row can be empty');
            throw new Error('Input Mode: "First Row As Headers" requires at most one cell in the header row can be empty.');
          }
          selectModel.noHeader = 'no header';
        } else {
          selectModel[column] = column;
        }
      });
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
  if (dimension === 'ROWS') {
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
  } else if (dimension === 'COLUMNS') {
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

  rowNames.forEach((v) => {
    let emptyHeader = 0;
    if (v === '' || v === undefined || v === null) {
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
      if (input.properties[v] !== undefined) {
        throw new Error('Input Mode: "First Row As Headers" requires cells in first row to be unique. Check: Common Errors section in docs.');
      }
      input.properties[v.toString().split(' ').join('')] = {
        title: v,
        description: v,
        type: 'string',
        required: v.toString() === upsertCriteria,
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
