const Influx = require('influx')

const client = new Influx.InfluxDB({
  database: 'covid19',
  host: process.env.INFLUXDB_HOST || "localhost",
  port: process.env.INFLUXDB_PORT || 8086,
  username: 'api',
  password: '123456',
  schema: [{
      measurement: 'ByCountry',
      fields: {
        Confirmed: Influx.FieldType.INTEGER,
        Deaths: Influx.FieldType.INTEGER,
        Recovered: Influx.FieldType.INTEGER,
        Date: Influx.FieldType.STRING,
        Country: Influx.FieldType.STRING,
      },
      tags: [
        'Country'
      ]
    },
    {
      measurement: 'Rank',
      fields: {
        Confirmed: Influx.FieldType.INTEGER,
        Country: Influx.FieldType.STRING
      },
      tags: [
        'Rank'
      ]
    }
  ]
});
module.exports = client;