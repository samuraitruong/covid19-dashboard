FROM node:alpine3.10
WORKDIR  /usr/app
COPY . .
RUN npm install
RUN npm install -g nodemon