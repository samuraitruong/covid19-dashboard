const schedule = require('node-schedule');
const CSSEGISandDataJob = require("./jobs/CSSEGISandData");
const worldometerJob = require("./jobs/worldometers");
const client = require("./client");

(async () => {
  if (process.env.NODE_ENV !== "production") {
    require('dotenv').config({});
  }

  const sleep = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout || 5000));
  do {
    try {
      console.log("Verify InfluxDB status");
      const dbNames = await client.getDatabaseNames();
      console.log("InfluxDB is ready, database names: ", dbNames)
      break;
    } catch (err) {
      console.warn("InfluxDB not ready , retrying after 5s");
      await sleep(5000);
    }
  } while (true);

  await CSSEGISandDataJob(client);
  await await worldometerJob(client);
  const scheduleCron = process.env.SCHEDULE_CRON || '* */1 * * *';
  console.log("Setup job schedule running by cron: ", scheduleCron)
  const job = schedule.scheduleJob(scheduleCron,
    async () => {
      try {
        console.log('Schedule running ....');
        await CSSEGISandDataJob(client);

        // run worldometer  job  to get lastest data
        await worldometerJob(client);
      } catch (err) {
        console.log("Job runner error", err)
      }
    });
})();