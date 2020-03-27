const axios = require("axios").default;
const cheerio = require("cheerio");
const moment = require("moment")
const australiaMeasurement = "Australia";
const logger = require("../logger");
const util = require("../util");

const toNumber = (stringNumber) => {
  stringNumber = stringNumber.replace(",", "");
  return parseInt(stringNumber, 10) || 0;
}
const wikiDataSource = async () => {
  const {
    data
  } = await axios.get("https://en.wikipedia.org/wiki/2020_coronavirus_pandemic_in_Australia");
  const $ = cheerio.load(data)
  const tables = $(".wikitable").toArray();
  $(tables[1]).find("sup").toArray().forEach(x => {
    $(x).remove()
  })
  const rows = $("tbody tr", tables[1]).toArray();
  const headers = $("th", rows[0]).toArray().map((th) => {
    return $(th).text().trim()
  })

  const results = rows.slice(1).map(tr => {
    const tds = $("td", tr).toArray()
    const item = {
      Date: $(tds[0]).text().trim(),
      NSW: toNumber($(tds[1]).text().trim()),
      QLD: toNumber($(tds[3]).text().trim()),
      VIC: toNumber($(tds[5]).text().trim()),
      SA: toNumber($(tds[7]).text().trim()),
      WA: toNumber($(tds[9]).text().trim()),
      TAS: toNumber($(tds[11]).text().trim()),
      ACT: toNumber($(tds[13]).text().trim()),
      NT: toNumber($(tds[15]).text().trim()),
      Total: toNumber($(tds[17]).text().trim()),
      NewCases: toNumber($(tds[18]).text().trim()),
      Growth: $(tds[19]).text().trim()
    }

    return item;
  })
  return results;
}
const nswDataSource = async () => {
  logger.info("Get data source from NSW health department")
  const url = "https://www.health.gov.au/news/health-alerts/novel-coronavirus-2019-ncov-health-alert/coronavirus-covid-19-current-situation-and-case-numbers";
  const {
    data,
    headers
  } = await axios.get(url);
  const $ = cheerio.load(data);
  const timestamp = util.momentToTimestamp(moment(headers["Last-Modified"]));

  const trs = $(".health-table__responsive tr").toArray();
  const states = trs.splice(1, trs.length - 3).map(tr => {
    const td = $("td", tr).toArray();
    return {

      State: $(td[0]).text().trim(),
      Confirmed: util.toNumber($(td[1]).text().trim())
    }
  })
  return {
    states,
    timestamp
  }
}
const normalizeData = (data) => {
  const list = [];
  const stateMappings = {
    VIC: "Victoria",
    NSW: "New South Wales",
    NT: "Northern Territory",
    QLD: "Queensland",
    TAS: "Tasmania",
    WA: "Western Australia",
    ACT: "Australian Capital Territory",
    SA: "South Australia"
  }

  const getItem = (item, state) => {
    return {
      Date: item.Date,
      State: stateMappings[state] || 'na',
      Confirmed: item[state]
    }
  }
  data.forEach(element => {
    Object.keys(element).slice(1).forEach(state => {
      if (state.match(/Total|Growth|Date/)) return;
      list.push(getItem(element, state))
    })
  });
  return list;
}
const writeDataToClient = async (client, data, timestamp) => {
  logger.info("Writing Australia data to InfluxDB")
  const points = data.map(x => {
    timestamp = timestamp || util.momentToTimestamp(moment(x.Date, "DD MMM YYYY"));

    return {
      measurement: australiaMeasurement,
      tags: {
        Country: "Australia",
        CountryCode: "AU",
        State: x.State
      },
      fields: {
        ...x,
      },
      timestamp
    }
  });
  try {
    await client.writePoints(points);
    logger.info('AustraliaHealth Job FINISHED ...');
  } catch (err) {
    logger.error("AustraliaHealth Job: Error writing to influxDB %j", err.message || err, {
      errorMessage: err.message,
      errorStack: err.stack
    });
  }
}

const australiaJob = async (client) => {
  try {
    logger.info("Australia Job started")
    const wikiData = await wikiDataSource();
    const transformedData = normalizeData(wikiData);
    // await client.dropMeasurement(australiaMeasurement);
    await writeDataToClient(client, transformedData)

    const healthData = await nswDataSource();
    await writeDataToClient(client, healthData.states, healthData.timestamp);
    logger.info("Australia job finished")
  } catch (err) {

    logger.error("AustraliaJob error %j", err.message || err, {
      errorMessage: err.message,
      errorStack: err.stack
    })
  }
}
module.exports = australiaJob;