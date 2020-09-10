const logger = require('@elastic.io/component-logger')();

const MAX_DELAY_BETWEEN_CALLS = 1140 * 1000;

const REQUEST_TIMEOUT_PERIOD = process.env.REQUEST_TIMEOUT_PERIOD
  ? parseInt(process.env.REQUEST_TIMEOUT_PERIOD, 10)
  : 100000; // 100s

const REQUEST_TIMEOUT_QUOTA = process.env.REQUEST_TIMEOUT_QUOTA
  ? parseInt(process.env.REQUEST_TIMEOUT_QUOTA, 10)
  : 500;


class QuotaManager {
  constructor(period, quota) {
    this.logger = logger;
    this.period = period || REQUEST_TIMEOUT_PERIOD;
    this.quota = quota || REQUEST_TIMEOUT_QUOTA;
    this.delay = QuotaManager.getDelayBetweenCalls(this.period, this.quota);
  }

  async rateLimit() {
    if (this.delay) {
      this.logger.info(`Delay Between Calls is set to: ${this.delay} ms`);
      this.logger.debug('Delay is start', new Date());
      await this.sleep();
      this.logger.debug('Delay is done', new Date());
    } else {
      this.logger.info(
        'Delay Between Calls is not set, process message without delay...',
      );
    }
  }

  static getDelayBetweenCalls(period, quota) {
    const delayBetweenCalls = period / quota;
    if (delayBetweenCalls < 0) {
      throw new Error(
        'Configuration error: Delay Between Calls should be positive value',
      );
    }
    if (delayBetweenCalls > MAX_DELAY_BETWEEN_CALLS) {
      throw new Error(
        `Configuration error: Delay Between Calls should be less than ${MAX_DELAY_BETWEEN_CALLS} milliseconds`,
      );
    }
    return delayBetweenCalls;
  }

  async sleep() {
    return new Promise((resolve) => {
      setTimeout(resolve, this.delay);
    });
  }
}

module.exports.QuotaManager = QuotaManager;
