const axios = require('axios');
const fs = require('fs');

Object.prototype.renameProperty = function(oldName, newName) {
  // Do nothing if the names are the same
  if (oldName == newName) {
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
  let response;
  try {
    response = await axios.get(
        'https://sheets.googleapis.com/$discovery/rest?version=v4',
        {responseType: 'json'});
  } catch (e) {
    console.error(e);
  }

  const {methods} = response.data.resources.spreadsheets;

  Object.keys(methods).forEach(method =>{
    const inMeta = methods[method].request;
    if (inMeta) {
      makeSchemaInline(inMeta);
    }

    const outMeta = methods[method].response;
    if (outMeta) {
      makeSchemaInline(outMeta);
    }

    const metadata = {in: inMeta, out: outMeta};
    console.log(JSON.stringify(metadata, null, 2));

    fs.writeFileSync(`schemas/${method}.json`, JSON.stringify(metadata, null, 2));
  });


  function makeSchemaInline(json) {
    Object.keys(json).forEach(key => {
      if (key === '$ref') {
        json[json[key]] = response.data.schemas[json[key]];
        if (typeof (json[json[key]]) === 'object') {
          makeSchemaInline(json[json[key]]);
        }
        delete json[key];
      } else if (key === 'items') {
        Object.defineProperty(json, 'properties', Object.getOwnPropertyDescriptor(json, 'items'));
        delete json.items;
        makeSchemaInline(json['properties']);
      } else if (typeof (json[key]) === 'object') {
        makeSchemaInline(json[key]);
      } else if (typeof (json[key]) === 'array') {
        json[key].forEach(item => {
          makeSchemaInline(item);
        });
      }
    });
  }
};

getMetadataForOperation('create');