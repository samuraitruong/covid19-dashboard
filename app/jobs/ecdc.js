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
  //dateRep, day, month, year, cases, deaths, countriesAndTerritories, geoId, countryterritoryCode, popData2018
  return new Promise((resolve, reject) => {
    Readable.from(csvData).pipe(csv({}))
      .on("data", (row) => {
        const item = {
          Date: row.dateRep,
          Confirmed: parseInt(row.cases) || 0,
          Country: row.countriesAndTerritories.replace(/_/g, " "),
          CountryCode: row.geoId || "na",
          CountryCode1: row.countryterritoryCode || "na"
        }
        results.push(item)
      })
      .on("end", () => {
        resolve(results)
      });
  });
}
const writeToInfluxDB = async (client, data, measurement) => {
  logger.info("Writing ecdc data to InfluxDB", measurement)
  const points = data.map(x => {
    const ts = util.momentToTimestamp(moment(x.Date, "DD/MM/YYYY"));
    return {
      measurement,
      tags: {
        Country: x.Country,
        CountryCode: x.CountryCode,
        CountryCode1: x.CountryCode
      },
      fields: {
        Date: x.Date,
        Confirmed: x.Confirmed
      },
      timestamp: ts
    }
  });
  try {
    await client.writePoints(points);
    logger.info('CSSEGISandDataJob FINISHED ...', measurement);
  } catch (err) {
    logger.error("Error writing to influxDB %j", err.message || err);
  }
}

const getData = async () => {
  const url = 'https://opendata.ecdc.europa.eu/covid19/casedistribution/csv/';
  const {
    data
  } = await axios.get(url);
  return parseCSV(data);
}
const ecdc = async (client) => {
  logger.info("Europa CDC Job started");
  try {
    const data = await getData();
    await writeToInfluxDB(client, data, "ecdc-geographic-distribution-covid-19-cases-worldwide");

    logger.info("Europa CDC Job finished")
  } catch (err) {
    logger.error("Europa CDC Job error %j", err.message || err, {
      errorStack: err.stack
    })
  }
}
module.exports = ecdc;

//getData().then(console.log)