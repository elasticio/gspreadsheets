const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const common = require('../lib/common');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('common test', () => {
  describe('getRetriesFromConfig test', () => {
    it('should return 4', async () => {
      const configuration = { retries: 3 };
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(4);
    });

    it('should return 5, empty cfg', async () => {
      const configuration = { };
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should return 5, more than 10', async () => {
      const configuration = { retries: 15 };
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should return 5, less than 1', async () => {
      const configuration = { retries: 0 };
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should return 5, not a number', async () => {
      const configuration = { retries: 'one' };
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });
  });
});
