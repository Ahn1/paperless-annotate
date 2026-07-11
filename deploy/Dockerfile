# Build-Stage: App mit Vite bauen (Kontext = Repo-Root, siehe deploy/docker-compose.yml)
FROM node:22-alpine AS build
WORKDIR /app
# pnpm in der Version aus package.json ("packageManager") aktivieren
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# .git liegt nicht im Build-Kontext (.dockerignore) → Version kommt als Build-Arg
# von deploy/update.sh; ohne Arg fällt vite.config.ts auf package.json zurück.
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
RUN pnpm run build

# Runtime-Stage: statische Auslieferung
FROM nginx:alpine-slim
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# Healthcheck ist Voraussetzung fuer das Zero-Downtime-Update (deploy/update.sh)
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
