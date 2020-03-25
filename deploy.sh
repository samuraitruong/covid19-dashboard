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
docker-compose down
docker-compose up --remove-orphans -d --build

iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 4000

