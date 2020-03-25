#!/bin/bash
set -e
# Refresh content on server using git pull command.

cd /home/covid19-dashboard
chmod -R 777 ./data
ls
git status
git fetch --all
git reset --hard origin/master

git pull
chmod -R 777 ./data
echo "Removing docker running"
docker-compose down
echo "Start new docker containers"
docker-compose up --remove-orphans -d --build

echo "Set IP forward rule to map port 80 to 4000 - grafana"
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 4000

echo "Install grafana plugins"
docker exec grafana sh -c "grafana-cli plugins install grafana-piechart-panel"

docker restart grafana
