module.exports = {
  'extends': 'airbnb-base',
  'parser': 'babel-eslint',
  'env': {
    'mocha': true
  },
  'rules': {
    'max-len': ['error', { 'code': 220 }],
    'no-plusplus': 'off',
  },
};
