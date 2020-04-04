const axios = require("axios").default;
const cheerio = require("cheerio");
const moment = require("moment");
const australiaMeasurement = "Australia";
const logger = require("../logger");
const util = require("../util");

const wikiDataSource = async () => {
  const { data } = await axios.get(
    "https://en.wikipedia.org/wiki/2020_coronavirus_pandemic_in_Australia"
  );
  const $ = cheerio.load(data);
  const tables = $(".wikitable").toArray();
  $(tables[1])
    .find("sup")
    .toArray()
    .forEach(x => {
      $(x).remove();
    });
  const rows = $("tbody tr", tables[1]).toArray();
  const headers = $("th", rows[0])
    .toArray()
    .map(th => {
      return $(th)
        .text()
        .trim();
    });

  const results = rows.slice(1).map(tr => {
    const tds = $("td", tr).toArray();
    const item = {
      Date: $(tds[0])
        .text()
        .trim(),
      NSW: util.toNumber(
        $(tds[1])
          .text()
          .trim()
      ),
      QLD: util.toNumber(
        $(tds[2])
          .text()
          .trim()
      ),
      VIC: util.toNumber(
        $(tds[3])
          .text()
          .trim()
      ),
      SA: util.toNumber(
        $(tds[4])
          .text()
          .trim()
      ),
      WA: util.toNumber(
        $(tds[5])
          .text()
          .trim()
      ),
      TAS: util.toNumber(
        $(tds[6])
          .text()
          .trim()
      ),
      ACT: util.toNumber(
        $(tds[7])
          .text()
          .trim()
      ),
      NT: util.toNumber(
        $(tds[8])
          .text()
          .trim()
      ),
      Total: util.toNumber(
        $(tds[9])
          .text()
          .trim()
      ),
      NewCases: util.toNumber(
        $(tds[10])
          .text()
          .trim()
      ),
      Growth: $(tds[11])
        .text()
        .trim()
    };

    return item;
  });
  return results;
};

const nswDataSource = async () => {
  logger.info("Get data source from NSW health department");
  const url =
    "https://www.health.gov.au/news/health-alerts/novel-coronavirus-2019-ncov-health-alert/coronavirus-covid-19-current-situation-and-case-numbers";
  const { data, headers } = await axios.get(url);
  const $ = cheerio.load(data);
  const timestamp = util.momentToTimestamp(moment(headers["Last-Modified"]));

  const trs = $(".health-table__responsive tr").toArray();
  const states = trs.splice(1, trs.length - 3).map(tr => {
    const td = $("td", tr).toArray();
    return {
      State: $(td[0])
        .text()
        .trim(),
      Confirmed: util.toNumber(
        $(td[1])
          .text()
          .trim()
      )
    };
  });
  return {
    states,
    timestamp
  };
};
const normalizeData = data => {
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
  };

  const getItem = (item, state) => {
    return {
      Date: item.Date || item.index,
      State: stateMappings[state] || "na",
      Confirmed: item[state]
    };
  };
  data.forEach(element => {
    Object.keys(element)
      .slice(1)
      .forEach(state => {
        if (state.match(/Total|Growth|Date/)) return;
        list.push(getItem(element, state));
      });
  });
  return list;
};
const writeDataToClient = async (client, data, measurement, timestamp) => {
  logger.info("Writing Australia data to InfluxDB :%s", measurement, {
    measurement
  });
  const points = data.filter(x =>x.Date).map(x => {
    const newTs =
      timestamp ||
      util.momentToTimestamp(
        moment(x.Date, ["DD MMMM", "DD MMM YYYY", "YYYY-MM-DD"])
      );

    return {
      measurement: measurement || australiaMeasurement,
      tags: {
        Country: "Australia",
        CountryCode: "AU",
        State: x.State
      },
      fields: {
        ...x
      },
      timestamp: newTs
    };
  });
  try {
    await client.writePoints(points);
    logger.info(
      "AustraliaHealth Job write measurement successful: %s",
      measurement,
      {
        measurement
      }
    );
  } catch (err) {
    logger.error(
      "AustraliaHealth Job: Error writing to influxDB %j",
      err.message || err,
      {
        errorMessage: err.message,
        errorStack: err.stack,
        measurement
      }
    );
  }
};
const getDataFromGuadian = async () => {
  //https://interactive.guim.co.uk/embed/iframeable/2019/01/reusable-stacked-bar-chart-v6/html/index.html?key=australian-covid-cases-2020&location=yacht-charter-data
  const { data } = await axios.get(
    "https://interactive.guim.co.uk/yacht-charter-data/australian-covid-cases-2020.json"
  );

  const res = await axios.get(
    "https://interactive.guim.co.uk/yacht-charter-data/australian-daily-covid-cases-2020.json"
  );
  return {
    total: normalizeData(data.sheets.data),
    daily: normalizeData(res.data.sheets.data)
  };
};
const australiaJob = async client => {
  try {
    logger.info("Australia Job started");
    const wikiData = await wikiDataSource();
    const transformedData = normalizeData(wikiData);
    // await client.dropMeasurement(australiaMeasurement);
    //await client.dropMeasurement("australian-wikipedia-sources");
    await writeDataToClient(client, transformedData, australiaMeasurement);
    await writeDataToClient(
      client,
      transformedData,
      "australian-wikipedia-sources"
    );

    const source = await getDataFromGuadian();
    await writeDataToClient(client, source.total, australiaMeasurement);
    await writeDataToClient(
      client,
      source.total,
      "australian-covid-cases-2020"
    );
    await writeDataToClient(
      client,
      source.daily,
      "australian-daily-covid-cases-2020"
    );

    const healthData = await nswDataSource();
    await writeDataToClient(
      client,
      healthData.states,
      australiaMeasurement,
      healthData.timestamp
    );
    logger.info("Australia job finished");
  } catch (err) {
    logger.error("AustraliaJob error %j", err.message || err, {
      errorMessage: err.message,
      errorStack: err.stack
    });
  }
};
module.exports = australiaJob;
