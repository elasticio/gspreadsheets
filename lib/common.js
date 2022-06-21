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

function getRetriesFromConfig(cfg) {
  const retries = Number(cfg.retries) ? Number(cfg.retries) : 5;
  if (retries < 0 || retries > 10) throw new Error('Number of retries must be from 0 to 10');
  return retries;
}

exports.columnToLetter = columnToLetter;
exports.getRetriesFromConfig = getRetriesFromConfig;
exports.transformToOutputStructure = transformToOutputStructure;
