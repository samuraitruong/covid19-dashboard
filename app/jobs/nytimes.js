const axios = require("axios").default.create();
const csv = require("csv-parser");
const util = require("../util");
const moment = require("moment");

const {
  Readable
} = require('stream')
const logger = require("../logger");

const parseCSV = async (csvData) => {
  const results = [];
  // date,county,state,fips,cases,deaths
  return new Promise((resolve, reject) => {
    Readable.from(csvData).pipe(csv({}))
      .on("data", (row) => {
        const item = {
          Date: row.date,
          Confirmed: parseInt(row.cases) || 0,
          Deaths: parseInt(row.deaths) || 0,
          Country: "US",
          State: row.state,
          City: row.county || "na"
        }
        results.push(item)
      })
      .on("end", () => {
        resolve(results)
      });
  });
}
const writeToInfluxDB = async (client, data, measurement) => {
  logger.info("Writing NYtimes data to InfluxDB", {measurement})
  const points = data.map(x => {
    const ts = util.momentToTimestamp(moment(x.Date, "YYYY-MM-DD"));
    return {
      measurement,
      tags: {
        Country: x.Country,
        State: x.State,
        City: x.City
      },
      fields: {
        ...x
      },
      timestamp: ts
    }
  });
  try {
    await client.writePoints(points);
    logger.info('NYTime successfull write data :measurement = %s', measurement, {
      measurement
    });
  } catch (err) {
    logger.error("Error writing to influxDB %j", err.message || err);
  }
}

const getData = async (url) => {
  logger.info("NYTimes - Get raw data from url", {
    url
  })
  const {
    data
  } = await axios.get(url);
  return parseCSV(data);
}
const nytimesJob = async (client) => {
  logger.info("NYTimes Job started");
  try {
    let
      url = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv';

    let data = await getData(url);
    await writeToInfluxDB(client, data, "nytimes-us-counties");

    url = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv';

    data = await getData(url);
    await writeToInfluxDB(client, data, "nytimes-us-states");

    logger.info("NYTimes Job finished")
  } catch (err) {
    logger.error("NYTimes Job error %j", err.message || err, {
      errorStack: err.stack
    })
  }
}
module.exports = nytimesJob;

//getData().then(console.log)