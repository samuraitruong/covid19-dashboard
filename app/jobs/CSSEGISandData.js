const moment = require("moment");
const lookup = require('country-code-lookup')
const GeoHash = require('ngeohash');

const {
  getCountriesData,
  getGlobalData,
  getCountryCombinedData
} = require("../data");
const writeDataToClient = async (client, data, measurement, country) => {
  console.log("Writing data to InfluxDB", measurement)
  const points = data.map(x => {
    const ts = moment(x.Date, "YYYY-MM-DD").unix() * 1000000000
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
        geohash
      },
      fields: {
        ...x,
        geohash
      },
      timestamp: ts
    }
  });
  try {
    await client.writePoints(points);
    console.log('CSSEGISandDataJob FINISHED ...', measurement);
  } catch (err) {
    console.log("Error writing to influxDB", err.message || err);
  }
}
const CSSEGISandDataJob = async (client) => {
  try {
    console.log('CSSEGISandDataJob Started ...');
    await client.dropMeasurement("ByCountry");

    const data = await getCountriesData();
    await writeDataToClient(client, data, "ByCountry");

    await client.dropMeasurement("WorldWide");
    const globalData = await getGlobalData();
    await writeDataToClient(client, globalData, "WorldWide", "Global");

    const combiedData = await getCountryCombinedData();
    // console.log("combiedData", combiedData)
    await client.dropMeasurement("Cases");
    await writeDataToClient(client, combiedData, "Cases");

  } catch (err) {
    console.log("CSSEGISandDataJob Error occured: ", err)
  }

}
module.exports = CSSEGISandDataJob;