const axios = require("axios").default;
const moment = require("moment");
const cheerio = require("cheerio");
const toNumber = (stringNumber) => {
  stringNumber = stringNumber.replace(",", "");
  return parseInt(stringNumber, 10) || 0;
}

const getData = async () => {
  const res = await axios.get("https://www.worldometers.info/coronavirus");
  const timestamp = moment(res.headers["date"]).unix() * 1000000000
  console.log("wordometer last update at ", res.headers["date"]);
  const $ = cheerio.load(res.data);

  const rows = $("#main_table_countries_today tbody tr").toArray();
  const data = rows.map((tr) => {
    const td = $("td", tr).toArray();
    let Country = $(td[0]).text().trim();
    // Make data same with other source 
    if (Country === "USA") Country = "US";

    return {
      Country,
      Confirmed: toNumber($(td[1]).text()),
      NewConfirmed: toNumber($(td[2]).text()),
      Deaths: toNumber($(td[3]).text()),
      NewDeaths: toNumber($(td[4]).text()),
      Recovered: toNumber($(td[5]).text()),
      ActiveCases: toNumber($(td[6]).text()),
      CriticalCase: toNumber($(td[7]).text()),
    }
  })
  return {
    data,
    timestamp
  }
}
const writeDataToClient = async (client, data, measurement, timestamp) => {
  console.log("Writing worldometer data to InfluxDB : measurement", measurement)
  const points = data.map(x => {
    x.Country = x.Country || country;
    delete x.NewDeaths;
    delete x.NewConfirmed;
    delete x.ActiveCases;
    delete x.CriticalCase;
    return {
      measurement,
      tags: {
        Country: x.Country
      },
      fields: {
        ...x
      },
      timestamp
    }
  });
  try {
    await client.writePoints(points);
    console.log('worldometer FINISHED ...', measurement);
  } catch (err) {
    console.log("worldometer Error writing to influxDB ", err);
  }
}

const writeRank = async (client, data) => {
  await client.dropMeasurement("Rank");

  console.log("Writing worldometer rank data to InfluxDB")
  const points = [];
  data.forEach((item, index) => {
    points.push({
      measurement: "Rank",
      tags: {
        Rank: index + 1
      },
      fields: {
        Country: item.Country,
        Confirmed: item.Confirmed
      },
    });
  });

  try {
    await client.writePoints(points);
    console.log('worldometer successful write rank data ...');
  } catch (err) {
    console.log("worldometer Error writing rank data to influxDB ", err);
  }
}



const worldometerJob = async (client) => {
  try {
    console.log("worldometerJob running...")
    const lastestData = await getData();
    await writeDataToClient(client, lastestData.data, "ByCountry", lastestData.timestamp)
    console.log("worldometerJob  finished");


    const sorted = lastestData.data.sort((a, b) => {
      return a.Confirmed > b.Confirmed
    });
    console.log("sorted", sorted)
    await writeRank(client, sorted);

  } catch (err) {
    console.log("worldometerJob error", err)
  }
}
module.exports = worldometerJob;