FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 1331
ENV NODE_ENV=production

CMD ["node", "index.js"]
