const axios = require("axios").default;
const csv = require("csv-parser");
const fs = require('fs')
const {
  Readable
} = require('stream')

const parseCSV = async (csvData) => {
  // console.log("csvData", csvData)
  const results = [];
  return new Promise((resolve, reject) => {
    Readable.from(csvData).pipe(csv({}))
      .on("data", (row) => {
        row.Deaths = parseInt(row.Deaths) || 0;
        row.Confirmed = parseInt(row.Confirmed) || 0;
        row.Recovered = parseInt(row.Recovered) || 0;
        results.push(row)
      })
      .on("end", () => {
        resolve(results)
      });
  });
}
const getCountriesData = async () => {
  url = "https://raw.githubusercontent.com/datasets/covid-19/master/data/countries-aggregated.csv";
  const {
    data
  } = await axios.get(url);
  return await parseCSV(data);
}

const getCountryCombinedData = async () => {
  url = "https://raw.githubusercontent.com/datasets/covid-19/master/data/time-series-19-covid-combined.csv";
  let {
    data
  } = await axios.get(url);
  data = data.replace("Country/Region,Province/State", "Country,State_Province")
  return await parseCSV(data);
}

const getGlobalData = async () => {
  url = "https://raw.githubusercontent.com/datasets/covid-19/master/data/worldwide-aggregated.csv";
  const {
    data
  } = await axios.get(url);
  return await parseCSV(data);
}

module.exports = {
  getCountriesData,
  getGlobalData,
  getCountryCombinedData
}
// test

// getCountriesData().then(x => console.log(x))