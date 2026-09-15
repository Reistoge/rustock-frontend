FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=build /app/dist/rustock-frontend/server ./server
COPY --from=build /app/dist/rustock-frontend/browser ./browser
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
ENV PORT=4200

EXPOSE 4200

CMD ["node", "server/server.mjs"]
