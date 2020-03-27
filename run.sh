# sudo chmod -R 777 data

# #iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 4000

#service iptables save
#service iptables restart

docker-compose down 
docker-compose up --remove-orphans -d --build 
docker-compose logs -f grafana job_runner influxdb chronograf elasticsearch kibana kapacitor


# deploy to google cloud machine
