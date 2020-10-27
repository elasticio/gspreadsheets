/* eslint-disable no-extend-native,no-use-before-define,no-prototype-builtins,no-param-reassign */

const axios = require('axios');
const fs = require('fs');

Object.prototype.renameProperty = function (oldName, newName) {
  // Do nothing if the names are the same
  if (oldName === newName) {
    return this;
  }
  // Check for the old property name to avoid a ReferenceError in strict mode.
  if (this.hasOwnProperty(oldName)) {
    this[newName] = this[oldName];
    delete this[oldName];
  }
  return this;
};

async function getMetadataForOperation() {
  const that = this;
  let response;
  try {
    response = await axios.get(
      'https://sheets.googleapis.com/$discovery/rest?version=v4',
      { responseType: 'json' },
    );
  } catch (e) {
    that.logger.error('Metadata request failed');
  }

  const { methods } = response.data.resources.spreadsheets;

  Object.keys(methods).forEach((method) => {
    const inMeta = methods[method].request;
    if (inMeta) {
      makeSchemaInline(inMeta);
    }

    const outMeta = methods[method].response;
    if (outMeta) {
      makeSchemaInline(outMeta);
    }

    const metadata = { in: inMeta, out: outMeta };
    that.logger.info('Metadata successfully generated');

    fs.writeFileSync(`schemas/${method}.json`, JSON.stringify(metadata, null, 2));
  });


  function makeSchemaInline(json) {
    if (Object.keys(json).indexOf('$ref') > -1) {
      const resolvation = response.data.schemas[json.$ref];

      json.properties = resolvation.properties;
      json.additionalProperties = resolvation.additionalProperties;
      json.id = resolvation.id;
      json.description = resolvation.description;
      json.title = resolvation.title;
      json.type = resolvation.type;
      delete json.$ref;
    }

    if (json.type === 'object') {
      if (json.properties) {
        Object.keys(json.properties).forEach((k) => {
          makeSchemaInline(json.properties[k]);
        });
      }
      if (json.additionalProperties) {
        makeSchemaInline(json.additionalProperties);
      }
    }
    if (json.type === 'array') {
      makeSchemaInline(json.items);
    }
  }
}

getMetadataForOperation('create');
