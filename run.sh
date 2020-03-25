# sudo chmod -R 777 data

docker-compose down && docker-compose up --remove-orphans -d --build && docker-compose logs -f grafana job_runner influxdb chronograf