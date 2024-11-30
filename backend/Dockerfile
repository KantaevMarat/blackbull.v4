FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install -g pm2
RUN npm install

COPY . .

EXPOSE 5000

CMD ["pm2-runtime", "start", "index.js"]
