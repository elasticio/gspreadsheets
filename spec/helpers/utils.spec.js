const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const utils = require('../../lib/helpers/utils');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('utils test', () => {
  describe('getRetriesFromConfig test', () => {
    it('should return 4', async () => {
      const configuration = { retries: 3 };
      const result = utils.getRetriesFromConfig(configuration);
      expect(result).to.equal(4);
    });

    it('should return 5, empty cfg', async () => {
      const configuration = { };
      const result = utils.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should return 5, more than 10', async () => {
      const configuration = { retries: 15 };
      const result = utils.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should return 5, less than 1', async () => {
      const configuration = { retries: 0 };
      const result = utils.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should return 5, not a number', async () => {
      const configuration = { retries: 'one' };
      const result = utils.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });
  });
});
