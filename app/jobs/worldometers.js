const axios = require("axios").default;
const moment = require("moment");
const cheerio = require("cheerio");
const logger = require("../logger");
const util = require("../util");
const extractChartData = (html) => {
  const matches = html.matchAll(/chart\('([^']*)',\s+([^;]*)\);/g);
  const data = [];
  for (const r of matches) {
    const json = r[2].replace("d'Ivoire", "dIvoire")
    const chart = eval(`(${json})`);
    if (!chart || !chart.xAxis) {
      console.log("not chart", r[1]);
      continue;
    }
    data.push({
      key: r[1],
      data: {
        categories: chart.xAxis.categories,
        values: chart.series[0].data
      }
    })
  }
  return data;
}
const getData = async () => {
  const res = await axios.get("https://www.worldometers.info/coronavirus");
  const timestamp = util.momentToTimestamp(moment(res.headers["date"]));
  logger.info("wordometer last update at %s", res.headers["date"]);
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
      Confirmed: util.toNumber($(td[1]).text()),
      NewConfirmed: util.toNumber($(td[2]).text()),
      Deaths: util.toNumber($(td[3]).text()),
      NewDeaths: util.toNumber($(td[4]).text()),
      Recovered: util.toNumber($(td[5]).text()),
      ActiveCases: util.toNumber($(td[6]).text()),
      CriticalCase: util.toNumber($(td[7]).text()),
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
        row[header] = util.toNumber($(tds[index]).text());
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
  const timestamp = util.momentToTimestamp(moment(res.headers["date"]));
  logger.info("wordometer last update at %s", url, res.headers["date"]);
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
  logger.info("Writing worldometer data to InfluxDB : measurement = %s", measurement)
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
    logger.info('worldometer FINISHED ... %s', measurement);
  } catch (err) {
    logger.info("worldometer Error writing to influxDB  %j", err);
  }
}

const writeRank = async (client, data) => {
  await client.dropMeasurement("Rank");

  logger.info("Writing worldometer rank data to InfluxDB")
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
    logger.info('worldometer successful write rank data ...');
  } catch (err) {
    logger.info("worldometer Error writing rank data to influxDB %j", err);
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
    logger.info("writing summary worldometer chart data : %s %s", item.key, country);
    const points = [];
    item.data.categories.forEach((date, index) => {
      const timestamp = moment(date, "MMM DD").unix() * 1000000000
      points.push({
        measurement: item.key,
        tags: {
          Country: country
        },
        fields: {
          Value: util.toNumber(item.data.values[index]) || 0,
        },
        timestamp
      });
    })
    try {
      // await client.dropMeasurement(item.key);
      await client.writePoints(points);
      logger.info('worldometer successful write chart data ... %s %s', item.key, country);
    } catch (err) {
      console.error("worldometer Error writing chart data to influxDB %j %s", err.message || err, country, item.key);
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
    logger.info("writing summary worldometer table data : %s %s %j", table.id, country, timestamp);
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
      logger.info('worldometer successful write data ... %s %s', item.key, country);
    } catch (err) {
      console.error("worldometer Error writing rank data to influxDB  %j %d %s", err.message || err, country, table.key);
    }
  }
}

const worldometerJob = async (client) => {
  try {
    logger.info("worldometerJob running...")
    const lastestData = await getData();
    await writeDataToClient(client, lastestData.data, "ByCountry", lastestData.timestamp);
    await writeDataToClient(client, lastestData.data, "worldometers-corona", lastestData.timestamp)
    // more case from here https://www.worldometers.info/coronavirus/coronavirus-cases/
    await writeChartData(client, lastestData.summary);

    for (const country in lastestData.ref) {
      if (lastestData.ref.hasOwnProperty(country)) {
        const url = lastestData.ref[country];
        logger.info("worldometer get country details %s %s", url, country)
        const au = await getDataFromUrl("https://www.worldometers.info/coronavirus/" + url, country);
        // logger.info("*********", au.tables)
        await writeChartData(client, au.data, au.country);
        await writeTableData(client, au.tables, au.country, au.timestamp);
      }
    }

    // test me
    const globalData = await getDataFromUrl("https://www.worldometers.info/coronavirus/coronavirus-cases/", "Global");
    await writeChartData(client, globalData.data, "Global");
    const sorted = lastestData.data.sort((a, b) => {
      return a.Confirmed > b.Confirmed
    });
    await writeRank(client, sorted);
    logger.info("worldometerJob finished");

  } catch (err) {
    logger.info("worldometerJob error %j", err)
  }
}
module.exports = worldometerJob;