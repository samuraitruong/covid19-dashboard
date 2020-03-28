// source
// https: //infogram.com/1pwemj1x57yd1lhvnmmeg9rj1yt96l9kp57
const logger = require("../logger");
const axios = require("axios").default;
const moment = require("moment");
const util = require("../util");
const geoService = require("../services/geo-service");
const geohash = require("ngeohash");

const writeDataToClient = async (client, data, timestamp) => {
  logger.info("Writing Infogram data to InfluxDB")

  const points = data.map(x => {

    return {
      measurement: "australia-infected-map",
      tags: {
        Country: "Australia",
        CountryCode: "AU",
        Location: x.location,
        geohash: x.geohash || geohash.encode(x.lat, x.lng)
      },
      fields: {
        Confirmed: x.value,
        Lat: x.lat,
        Long: x.lng
      },
      //timestamp
    }
  });
  try {
    await client.writePoints(points);
    logger.info('Infogram Job successful write data ...');
  } catch (err) {
    logger.error("Infogram Job: Error writing to influxDB %j", err.message || err, {
      errorMessage: err.message,
      errorStack: err.stack
    });
  }
}

const getRawData = async () => {
  const url = "https://infogram.com/1pwemj1x57yd1lhvnmmeg9rj1yt96l9kp57";
  logger.info("Get raw data from infogram %s", url, {
    url
  });

  const {
    data,
    headers
  } = await axios.get(url);
  logger.info("Infogram page update at %s", headers["date"])
  const match = data.match(/,"data":(.*),("custom":)/, "ig");
  const list = eval(match[1])[0];
  const locations = list.map(x => {
    return {
      location: x[0].trim().replace("\n ", ""),
      value: x[1]
    }
  }).filter(x => x.value > 0)
  return {
    locations,
    timestamp: util.momentToTimestamp(moment(headers["date"]))
  }
}
const retrieveGeoData = async (client, data) => {

  for (const item of data) {
    const query = await client.query(`SELECT * FROM "australia-infected-map" WHERE Location='${item.location}' AND geohash != null LIMIT 1`);
    if (query[0] && query[0].geohash) {
      logger.info("Found geo data for existing location %s : %j", item.location, query[0]);
      item.geohash = query[0].geohash;
      item.lat = query[0].Lat;
      item.lng = query[0].Long;
      continue;
    }
    const geo = await geoService.getGeoLocation(item.location + ",AU");
    item.lat = geo.lat;
    item.lng = geo.lng;
  }
}
const infogramJob = async (client) => {
  try {
    logger.info("Infogram Job started")
    //await client.dropMeasurement("australia-infected-map");
    const data = await getRawData();
    await retrieveGeoData(client, data.locations);
    await writeDataToClient(client, data.locations, data.timestamp)
    logger.info("Infogram job finished")
  } catch (err) {
    logger.error("Infogram error %j", err.message || err, {
      errorMessage: err.message,
      errorStack: err.stack
    })
  }
}

module.exports = infogramJob;