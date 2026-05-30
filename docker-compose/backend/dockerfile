FROM node:20-alpine

WORKDIR /app

# COPY package.json ./
# COPY package-lock.json ./

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "server.js"]