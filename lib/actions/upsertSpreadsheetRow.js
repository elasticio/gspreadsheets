const { messages } = require('elasticio-node');

const { GoogleOauth2Client } = require('../client');
const { QuotaManager } = require('../quotaManager');
const { columnToLetter } = require('../common');
const { listWorksheets, listSpreadsheets } = require('../commonSelectModels');

const HEADER = 'header';
const ARRAY = 'array';

async function processAction(msg, cfg) {
  this.logger.info('Start action %j, %j', msg, cfg);
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const query = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const qValues = query.data.values;
  if (!qValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  const { body } = msg;
  const { dimension, mode, upsertCriteria } = cfg;
  if (dimension === 'ROWS') {
    let columnNames = [];
    let i = 0;
    if (mode === HEADER || mode === undefined) {
      // eslint-disable-next-line prefer-destructuring
      columnNames = qValues[0];
      i = 1;
    }
    if (mode === ARRAY) {
      for (let j = 0; j < qValues[0].length; j++) {
        const letter = columnToLetter(j + 1);
        columnNames.push(letter);
      }
    }
    const upsertCriteriaIndex = columnNames.indexOf(upsertCriteria);
    let isRowDataPresent = 0;
    let rowPosition;
    for (i; i < qValues.length; i++) {
      if (qValues[i][upsertCriteriaIndex] === body[upsertCriteria]) {
        isRowDataPresent++;
        rowPosition = i;
      }
    }
    if (isRowDataPresent > 1) {
      throw new Error('More than one rows found');
    }
    if (isRowDataPresent === 0) {
      const inputData = [];
      for (let j = 0; j < columnNames.length; j++) {
        const newCellData = body[columnNames[j]];
        if (newCellData) {
          inputData.push(newCellData);
        } else {
          inputData.push('');
        }
      }
      // eslint-disable-next-line max-len
      const result = await oAuth2Client.callFunction(oAuth2Client.writeToSpreadsheet, inputData);
      this.logger.info(result);
      throw new Error('More than one rows found');
    } else {
      const range = `${cfg.worksheetId}!A${rowPosition + 1}:${columnToLetter(columnNames.length)}${rowPosition + 1}`;
      const inputData = [];
      const existingData = qValues[rowPosition];
      for (let j = 0; j < columnNames.length; j++) {
        const newCellData = body[columnNames[j]];
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
      // eslint-disable-next-line max-len
      const result = await oAuth2Client.callFunction(oAuth2Client.updateSpreadsheetRow, { range, values: inputData });
      this.logger.info(result);
    }
  } else if (dimension === 'COLUMNS') {
    const rowNames = [];
    let i = 0;
    if (mode === HEADER || mode === undefined) {
      qValues.forEach((val) => {
        rowNames.push(val[0]);
      });
      i = 1;
    }
    if (mode === ARRAY) {
      for (let j = 1; j < qValues.length + 1; j++) {
        rowNames.push(j);
      }
      i = 0;
    }
    this.logger.info(rowNames);
    const upsertCriteriaIndex = rowNames.indexOf(upsertCriteria);
    let isColumnDataPresent = 0;
    let columnPosition;
    for (i; i < qValues[0].length; i++) {
      if (qValues[upsertCriteriaIndex][i] === body[upsertCriteria].toString()) {
        isColumnDataPresent++;
        columnPosition = i;
      }
    }
    if (isColumnDataPresent > 1) {
      throw new Error('More than one rows found');
    }
    if (isColumnDataPresent === 0) {
      const inputData = [];
      for (let j = 0; j < rowNames.length; j++) {
        const newCellData = body[rowNames[j]];
        if (newCellData) {
          inputData.push(newCellData);
        } else {
          inputData.push('');
        }
      }
      const range = `${cfg.worksheetId}!${columnToLetter(qValues[0].length + 1)}1:${columnToLetter(qValues[0].length + 1)}${rowNames.length}`;
      // eslint-disable-next-line max-len
      const result = await oAuth2Client.callFunction(oAuth2Client.writeColumnToSpreadsheet, { range, values: inputData });
      this.logger.info(result);
    } else {
      const range = `${cfg.worksheetId}!${columnToLetter(columnPosition + 1)}1:${columnToLetter(columnPosition + 1)}${rowNames.length}`;
      const inputData = [];
      const existingData = qValues.map(val => val[columnPosition]);
      for (let j = 0; j < rowNames.length; j++) {
        const newCellData = body[rowNames[j]];
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
      // eslint-disable-next-line max-len
      const result = await oAuth2Client.callFunction(oAuth2Client.updateSpreadsheetColumn, {
        range,
        values: inputData,
      });
      this.logger.info(result);
    }
  } else {
    throw new Error(` Unsupported dimension: ${dimension}`);
  }


  const quotaManager = new QuotaManager(cfg);
  await quotaManager.rateLimit();
  return messages.newMessageWithBody(msg.body);
}

async function getUpsertCriteria(cfg) {
  const { dimension, mode } = cfg;
  const selectModel = {};
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const query = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const qValues = query.data.values;
  if (!qValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  if (dimension === 'ROWS') {
    const firstRow = qValues[0];
    if (mode === HEADER || mode === undefined) {
      firstRow.forEach((item) => {
        selectModel[item] = item;
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
    qValues.forEach((val) => {
      firstColumn.push(val[0]);
    });
    this.logger.info('firstColumn %j', firstColumn);
    if (mode === HEADER || mode === undefined) {
      firstColumn.forEach((item) => {
        selectModel[item] = item;
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
      updates: {
        type: 'object',
        required: true,
        properties: {
          spreadsheetId: {
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
      },
    },
  };
  const input = {
    type: 'object',
    properties: {
    },
  };
  const { dimension, mode, upsertCriteria } = cfg;
  const oAuth2Client = new GoogleOauth2Client(cfg, this);
  const query = await oAuth2Client.callFunction(oAuth2Client.getSpreadsheet);
  const qValues = query.data.values;
  if (!qValues) {
    throw new Error('Spreadsheet should not be empty');
  }
  let rowNames = [];
  if (dimension === 'ROWS') {
    const firstRow = qValues[0];
    if (mode === HEADER || mode === undefined) {
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
    qValues.forEach((val) => {
      firstColumn.push(val[0]);
    });
    this.logger.info('firstColumn %j', firstColumn);
    if (mode === HEADER || mode === undefined) {
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
    if (v === '' || v === undefined || v === null) {
      this.logger.error('Found cell with empty value in header row');
      throw new Error('Input Mode: "First Row As Headers" requires cells in first row to be not empty. Check: Common Errors section in docs.');
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
