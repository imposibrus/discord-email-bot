FROM node:12.18.2-buster

ENV WORKDIR=/usr/src/app

WORKDIR $WORKDIR

COPY package.json package-lock.json $WORKDIR/
RUN npm ci --prefer-offline --no-audit --production

COPY index.js $WORKDIR/

CMD node --unhandled-rejections=strict index.js
