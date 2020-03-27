const axios = require("axios").default;
const cheerio = require("cheerio");
const moment = require("moment")
const australiaMeasurement = "Australia";
const logger = require("../logger");
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
      Date: $(tds[0]).text().trim()
    }
    for (let i = 1; i < tds.length; i++) {
      item[headers[i]] = toNumber($(tds[i]).text().trim())
    }
    return item;
  })
  return results;
}
const normalizeData = (data) => {
  const list = [];
  const getItem = (item, state) => {
    return {
      Date: item.Date,
      StateCode: state,
      Confirmed: item[state]
    }
  }
  data.forEach(element => {
    Object.keys(element).slice(1).forEach(state => {
      list.push(getItem(element, state))
    })
  });
  return list;
}
const writeDataToClient = async (client, data) => {
  logger.info("Writing Australia data to InfluxDB")
  const stateMappings = {
    VIC: "Victoria",
    NSW: "New South Wales",
    NT: "Northen Teritory",
    QLD: "Queensland",
    TAS: "Tasmania",
    WA: "Western Australia",
    ACT: "Australian Capital Territory",
    SA: "South Australia"
  }

  const points = data.map(x => {
    const ts = moment(x.Date, "DD MMM YYYY").unix() * 1000000000

    return {
      measurement: australiaMeasurement,
      tags: {
        Country: "Australia",
        CountryCode: "AU",
        State: stateMappings[x.StateCode.toUpperCase()] || 'na'
      },
      fields: {
        ...x,
      },
      timestamp: ts
    }
  });
  try {
    await client.writePoints(points);
    logger.info('AustraliaHealth Job FINISHED ...');
  } catch (err) {
    logger.error("AustraliaHealth Job: Error writing to influxDB", err.message || err);
  }
}

const australiaJob = async (client) => {
  try {
    logger.info("australiaJob started")
    const wikiData = await wikiDataSource();
    const transformedData = normalizeData(wikiData);
    await await client.dropMeasurement(australiaMeasurement);
    await writeDataToClient(client, transformedData)
    logger.info("australiaJob finished")
  } catch (err) {
    console.error("australiaJob error", err.message || err)
  }
}
module.exports = australiaJob;

//australiaJob().then(logger.info)//