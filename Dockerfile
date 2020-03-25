FROM node:alpine3.10
WORKDIR  /usr/app
COPY ./app .
RUN npm install
RUN ls