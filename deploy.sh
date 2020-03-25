#!/bin/bash

# this is command that store on VM that will pull master branch and restart docker

cd /home/covid19-dashboard
chmod -R 777 ./data
ls
git status
git fetch --all
git reset --hard origin/master

git pull

docker-compose down && docker-compose up --remove-orphans -d --build
