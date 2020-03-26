const axios = require("axios").default;
const moment = require("moment");
const cheerio = require("cheerio");
const toNumber = (stringNumber) => {
  if (!stringNumber) return 0;
  if (!stringNumber.replace) return stringNumber;

  stringNumber = stringNumber.replace(",", "");
  stringNumber = stringNumber.replace("+", "");
  return parseInt(stringNumber, 10) || 0;
}
const extractChartData = (html) => {
  const matches = html.match(/chart\('(.*)',\s+([^;]*)/igm);
  const data = [];
  matches.forEach((m) => {
    m = m.replace(/\n/g, "")
    const el = m.match(/chart\('([^,]*)',\s+(.*)\)/m);
    data.push({
      key: m.match(/chart\('([^,]*)',/m)[1],
      data: {
        categories: eval(m.match(/categories:([^}]*)/m)[1]),
        values: eval(m.match(/data:([^}]*)/m)[1])
      }
    })
  })
  return data;
}
const getData = async () => {
  const res = await axios.get("https://www.worldometers.info/coronavirus");
  const timestamp = moment(res.headers["date"]).unix() * 1000000000
  console.log("wordometer last update at ", res.headers["date"]);
  const $ = cheerio.load(res.data);
  const summary = extractChartData(res.data);
  const rows = $("#main_table_countries_today tbody tr").toArray();
  const ref = {};
  const data = rows.map((tr) => {
    const td = $("td", tr).toArray();
    let Country = $(td[0]).text().trim();
    const href = $(".mt_a", td[0]).attr("href");
    // Make data same with other source 
    if (Country === "USA") Country = "US";
    if (Country === "S. Korea") Country = "Korea, South";
    if (href) {
      ref[Country] = href;
    }
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
    ref,
    data: data.filter(x => x.Country !== "Total:"),
    summary,
    timestamp
  }
}
const extractTableData = ($) => {
  const tables = $("table").toArray();
  return tables.map((table) => {
    const headers = $(table).find("thead th").toArray().map(x => {
      return $(x).text().trim()
    });
    const data = $("tbody tr", table).toArray().map((r) => {
      const tds = $("td", r);
      const row = {
        state: $(tds[0]).text().trim()
      };
      headers.forEach((header, index) => {
        row[header] = toNumber($(tds[index]).text());
      });
      return row;
    })
    return {
      headers,
      data,
      id: $(table).attr("id")
    }
  });
}
const getDataFromUrl = async (url, country) => {
  const res = await axios.get(url);
  const timestamp = moment(res.headers["date"]).unix() * 1000000000
  console.log("wordometer last update at ", url, res.headers["date"]);
  const $ = cheerio.load(res.data);
  const data = extractChartData(res.data);
  const tables = extractTableData($);
  return {
    tables,
    country,
    data,
    timestamp
  }

}
const writeDataToClient = async (client, data, measurement, timestamp) => {
  console.log("Writing worldometer data to InfluxDB : measurement", measurement)
  const points = data.map(x => {
    x.Country = x.Country || country;
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
/**
 * Write all summary data from home page of worldometer
 * @param {*} client 
 * @param {*} data 
 */
const writeChartData = async (client, charts, country) => {
  country = country || "Global";
  for (const item of charts) {
    console.log("writing summary worldometer chart data :", item.key, country);
    const points = [];
    item.data.categories.forEach((date, index) => {
      const timestamp = moment(date, "MMM DD").unix() * 1000000000
      points.push({
        measurement: item.key,
        tags: {
          Country: country
        },
        fields: {
          Value: toNumber(item.data.values[index]) || 0,
        },
        timestamp
      });
    })
    try {
      // await client.dropMeasurement(item.key);
      await client.writePoints(points);
      console.log('worldometer successful write chart data ...', item.key, country);
    } catch (err) {
      console.error("worldometer Error writing chart data to influxDB ", err.message || err, country, item.key);
    }
  }
}
/**
 * Write the sub table in country page to database
 * @param {*} client 
 * @param {*} tables 
 * @param {*} country 
 * @param {*} timestamp 
 */
const writeTableData = async (client, tables, country, timestamp) => {
  country = country || "Global";
  for (const table of tables) {
    console.log("writing summary worldometer table data :", table.id, country, timestamp);
    const points = [];
    table.data.forEach((item) => {
      points.push({
        measurement: table.id,
        tags: {
          Country: country,
          State: item.state
        },
        fields: {
          ...item
        },
        timestamp
      });
    })
    try {
      // await client.dropMeasurement(item.key);
      await client.writePoints(points);
      console.log('worldometer successful write data ...', item.key, country);
    } catch (err) {
      console.error("worldometer Error writing rank data to influxDB ", err.message || err, country, table.key);
    }
  }
}

const worldometerJob = async (client) => {
  try {
    console.log("worldometerJob running...")
    const lastestData = await getData();
    await writeDataToClient(client, lastestData.data, "ByCountry", lastestData.timestamp)
    console.log("worldometerJob  finished");
    // more case from here https://www.worldometers.info/coronavirus/coronavirus-cases/
    await writeChartData(client, lastestData.summary);

    for (const country in lastestData.ref) {
      if (lastestData.ref.hasOwnProperty(country)) {
        const url = lastestData.ref[country];
        console.log("worldometer get country details", url, country)
        const au = await getDataFromUrl("https://www.worldometers.info/coronavirus/" + url, country);
        // console.log("*********", au.tables)
        await writeChartData(client, au.data, au.country);
        await writeTableData(client, au.tables, au.country, au.timestamp);
      }
    }


    const sorted = lastestData.data.sort((a, b) => {
      return a.Confirmed > b.Confirmed
    });
    await writeRank(client, sorted);

  } catch (err) {
    console.log("worldometerJob error", err)
  }
}
module.exports = worldometerJob;
// test me
getDataFromUrl("https://www.worldometers.info/coronavirus/country/us/", "US").then((d) => {
  console.log(d)

})