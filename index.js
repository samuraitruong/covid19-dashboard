const moment = require("moment");
const schedule = require('node-schedule');
const CSSEGISandDataJob = require("./jobs/CSSEGISandData");

(async () => {
  const Influx = require('influx')
  // You can generate a Token from the "Tokens Tab" in the UI
  const {
    getCountriesData
  } = require("./data")
  if (process.env.NODE_ENV !== "production") {
    require('dotenv').config({});
  }

  const client = new Influx.InfluxDB({
    database: 'covid19',
    host: process.env.INFLUXDB_HOST || "localhost",
    port: process.env.INFLUXDB_PORT || 8086,
    username: 'api',
    password: '123456',
    schema: [{
      measurement: 'ByCountry',
      fields: {
        Confirmed: Influx.FieldType.INTEGER,
        Deaths: Influx.FieldType.INTEGER,
        Recovered: Influx.FieldType.INTEGER,
        Date: Influx.FieldType.STRING,
        Country: Influx.FieldType.STRING,
      },
      tags: [
        'Country'
      ]
    }]
  });

  await CSSEGISandDataJob(client);

  const job = schedule.scheduleJob(process.env.SCHEDULE_CRON || '* */1 * * *',
    async () => {
      try {
        console.log('Schedule running ....');
        await CSSEGISandDataJob(client);
      } catch (err) {
        console.log("Job runner error", err)
      }

    });


})();