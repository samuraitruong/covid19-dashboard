## Get Started
This is grafana dashboard to display realtime data for covid-19
### Prerequirements
You need to have docker & docker-compose install on development machine

### Run on local
```sh
  docker-compose up
```

There also a dev script in run.sh that you can run to spin up the stack
```sh
 ./run.sh

```

You can use docker-compose down command to clean up resource, Data will be persisted into ./data folder

### Access
The port mapping is set in docker-compose.yml file. Below are some endpoint

### InfluxDB
host: influxdb
port: 8086 

url: http://influxdb:8086 or http://localhost:8086 on host machine


### Grafana

Running on port 4000 
- host: http://localhost:4000
- username: admin
- password: 123456

### Chronograf
Is the Admin UI to manage influxdb
- host: http://localhost:8888

## Update Dashboard & Data
### Job_runner
Runner is responsible to collect data from upstream data and update into influx server, If you want to get more data and introduce new datasource, you can add more job  under ./job folder and update index.js file

Current we are collect data from 2 resources below:
- https://github.com/datasets/covid-19 which is snapshot copied and transformation of this official data - https://github.com/CSSEGISandData/COVID-19
- https://www.worldometers.info/coronavirus/ : this to get lastest data that above that maybe missed

Data will be update into influxdb by :
- when Application start
- schedule every 5 mins, can be change in docker-compose file
### Dashboard
Grafana already setup with data source to retrieving data from influxdb. 

For any new custom dashboard please place the json file into ./data/grafana/{folder}/you-dashboad.json

Here is the step to create new dashboard :
- Login to grafana using credentials above
- Create or modify dashboard
- Get json model of that dashboard (use export/ or json model in setting panel)
- Save that json file into folder ./data/grafana/{folder}/you-dashboad.json

