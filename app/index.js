const CSSEGISandDataJob = require("./jobs/CSSEGISandData");
const worldometerJob = require("./jobs/worldometers");
const australiaJob = require("./jobs/australiaHealth")
const infogramJob = require("./jobs/infogram");
const CronJob = require('cron').CronJob;


const client = require("./client");
const logger = require("./logger");
(async () => {
  process.on("unhandledRejection", (reason) => {
    logger.error('unhandledRejection error : ', reason)
  })
  process.on("unhandledRejection", (reason) => {
    logger.error('unhandledRejection  error : ', reason)
  })
  logger.info("Job runner started %s", {
    app: "job_runner",
  })
  if (process.env.NODE_ENV !== "production") {
    require('dotenv').config({});
  }

  const sleep = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout || 5000));
  do {
    try {
      logger.info("Verify InfluxDB status");
      const dbNames = await client.getDatabaseNames();
      logger.info("InfluxDB is ready, database names: %j ", dbNames)
      break;
    } catch (err) {
      logger.warn("InfluxDB not ready , retrying after 5s");
      await sleep(5000);
    }
  } while (true);
  const jobTaks = async () => {
    await infogramJob(client);
    await CSSEGISandDataJob(client);
    await worldometerJob(client);
    await australiaJob(client);

  }
  const scheduleCron = process.env.SCHEDULE_CRON || '* */1 * * *';

  await jobTaks();
  logger.info("Setup job schedule running by cron: %s", scheduleCron)
  var job = new CronJob(scheduleCron, async () => {
    try {
      logger.info('---- Scheduler started ----');
      await jobTaks();
      logger.info('---- Scheduler finished ----');
    } catch (err) {
      logger.info("Job runner error %s", err.message || err, {
        error: error.stack
      })
    }
  }, null, true, 'America/Los_Angeles');
  job.start();
})();