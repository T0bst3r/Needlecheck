# Crate builder. The bot image is Dockerfile. This one serves the page.
FROM node:22-bookworm-slim AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN mkdir -p /music
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    MEDIA_ROOT=/music
COPY --from=build /app/.output ./.output
EXPOSE 8080
VOLUME ["/music"]
CMD ["node", ".output/server/index.mjs"]
