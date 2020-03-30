const moment = require("moment");
const lookup = require('country-code-lookup')
const GeoHash = require("ngeohash");
const logger = require("../logger");
const util = require("../util");

const {
  getCountriesData,
  getGlobalData,
  getCountryCombinedData
} = require("../data");
const writeDataToClient = async (client, data, measurement, country) => {
  logger.info("Writing data to InfluxDB", measurement)
  const points = data.map(x => {
    const ts = util.momentToTimestamp(moment(x.Date, "YYYY-MM-DD"));
    x.Country = x.Country || country;
    const countryCode = lookup.byCountry(x.Country) || {};
    let geohash = GeoHash.encode(0, 0);
    if (x.Lat && x.Long) {
      geohash = GeoHash.encode(x.Lat, x.Long)
    }
    return {
      measurement,
      tags: {
        Country: x.Country,
        CountryCode: countryCode.iso2 || 'na',
        State: x.State_Province || 'na',
        geoname: `${x.Country} - ${x.State_Province || ""}`,
        geohash
      },
      fields: {
        ...x,
        geohash,
      },
      timestamp: ts
    }
  });
  try {
    await client.writePoints(points);
    logger.info('CSSEGISandDataJob FINISHED ...', measurement);
  } catch (err) {
    logger.error("Error writing to influxDB", err.message || err);
  }
}
const CSSEGISandDataJob = async (client) => {
  try {
    logger.info('CSSEGISandDataJob Started ...');
    // await client.dropMeasurement("ByCountry");

    const data = await getCountriesData();
    await writeDataToClient(client, data, "ByCountry");

    // await client.dropMeasurement("WorldWide");
    const globalData = await getGlobalData();
    await writeDataToClient(client, globalData, "WorldWide", "Global");

    const combiedData = await getCountryCombinedData();
    // logger.info("combiedData", combiedData)
    // await client.dropMeasurement("Cases");
    await writeDataToClient(client, combiedData, "Cases");

  } catch (err) {
    logger.error("CSSEGISandDataJob Error occured: ", err)
  }

}
module.exports = CSSEGISandDataJob;