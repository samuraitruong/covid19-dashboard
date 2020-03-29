const {
  transports,
  createLogger,
  format
} = require('winston');
const {
  Client
} = require('@elastic/elasticsearch')
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: true
})

const moment = require("moment")
const Elasticsearch = require('winston-elasticsearch');

const esTransportOpts = {
  level: 'info',
  client,
  // transformer: (l) => {
  //   console.log("debug", l);
  //   return l;
  // }
};
const tsFormat = () => moment().format('YYYY-MM-DD hh:mm:ss').trim();
const logger = createLogger({
  timestamp: tsFormat,
  format: format.combine(
    format.splat(),
    format.json(),
    format.simple(),
  ),
  transports: [

    new transports.Console({
      //   timestamp: tsFormat,

      format: format.combine(
        format.colorize(),
        format.printf(info => `${tsFormat()} ${info.level}: ${info.message}`)
      )
    }),
    new Elasticsearch(esTransportOpts)
  ]
});


module.exports = logger;