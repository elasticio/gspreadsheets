const logger = require('@elastic.io/component-logger')();

const MAX_DELAY_BETWEEN_CALLS = 1140 * 1000;

class QuotaManager {
  constructor(cfg) {
    this.logger = logger;
    const maxNumberOfCallsPerSecond = this.getMaxNumberOfCallsPerSecond(cfg);
    this.delay = QuotaManager.getDelayBetweenCalls(maxNumberOfCallsPerSecond);
  }

  // eslint-disable-next-line class-methods-use-this
  getMaxNumberOfCallsPerSecond(cfg) {
    let maxNumberOfCallsPerSecond = parseInt(cfg.maxNumberOfCallsPerSecond, 10) || 5;
    if (maxNumberOfCallsPerSecond === 0) maxNumberOfCallsPerSecond = 5;
    return maxNumberOfCallsPerSecond;
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

  static getDelayBetweenCalls(maxNumberOfCallsPerSecond) {
    const delayBetweenCallsMs = (1 / maxNumberOfCallsPerSecond) * 1000;
    if (delayBetweenCallsMs < 0) {
      throw new Error(
        'Configuration error: Delay Between Calls should be positive value',
      );
    }
    if (delayBetweenCallsMs > MAX_DELAY_BETWEEN_CALLS) {
      throw new Error(
        `Configuration error: Delay Between Calls must be less than ${MAX_DELAY_BETWEEN_CALLS} milliseconds`,
      );
    }
    return delayBetweenCallsMs;
  }

  async sleep() {
    return new Promise((resolve) => {
      setTimeout(resolve, this.delay);
    });
  }
}

module.exports.QuotaManager = QuotaManager;
