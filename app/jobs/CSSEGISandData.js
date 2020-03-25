const moment = require("moment");

const {
  getCountriesData,
  getGlobalData
} = require("../data");
const writeDataToClient = async (client, data, measurement, country) => {
  console.log("Writing data to InfluxDB", measurement)
  const points = data.map(x => {
    const ts = moment(x.Date, "YYYY-MM-DD").unix() * 1000000000
    x.Country = x.Country || country;

    return {
      measurement,
      tags: {
        Country: x.Country
      },
      fields: {
        ...x
      },
      timestamp: ts
    }
  });
  try {
    await client.writePoints(points);
    console.log('CSSEGISandDataJob FINISHED ...', measurement);
  } catch (err) {
    console.log("Error writing to influxDB", err);
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

  } catch (err) {
    console.log("CSSEGISandDataJob Error occured: ", err)
  }

}
module.exports = CSSEGISandDataJob;