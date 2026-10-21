FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm_config_build_from_source=true npm ci --omit=dev

COPY server.js ./

FROM node:24-bookworm-slim

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.js ./server.js

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
