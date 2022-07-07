const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const common = require('../lib/common');

chai.use(chaiAsPromised);
const { expect } = chai;

xdescribe('common test', () => {
  describe('getRetriesFromConfig test', () => {
    it('should return 3', async () => {
      const configuration = { retries: 3 };
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(3);
    });

    it('should return 5, empty cfg', async () => {
      const configuration = {};
      const result = common.getRetriesFromConfig(configuration);
      expect(result).to.equal(5);
    });

    it('should throw error', async () => {
      const configuration = { retries: 15 };
      try {
        common.getRetriesFromConfig(configuration);
      } catch (e) {
        expect(e.message).to.equal('Number of retries must be from 0 to 10');
      }
    });
  });
});
