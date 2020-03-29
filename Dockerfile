FROM node:13.12.0-alpine3.10
WORKDIR  /usr/app
COPY ./app .
RUN npm install
RUN ls