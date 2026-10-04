FROM node:22-bookworm-slim AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY bot/package.json bot/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg python3 \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY bot/package.json ./
COPY bot/src ./src
COPY docker-entrypoint.sh /usr/local/bin/needlecheck-entrypoint
RUN chmod +x /usr/local/bin/needlecheck-entrypoint \
  && mkdir -p /music

ENV NODE_ENV=production \
    MEDIA_ROOT=/music \
    YOUTUBE=0

VOLUME ["/music"]

ENTRYPOINT ["needlecheck-entrypoint"]
