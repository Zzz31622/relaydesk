FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY public ./public
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4173

EXPOSE 4173

USER node

CMD ["node", "src/server.js"]
