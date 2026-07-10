# Build-Stage: App mit Vite bauen (Kontext = Repo-Root, siehe deploy/docker-compose.yml)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime-Stage: statische Auslieferung
FROM nginx:alpine-slim
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# Healthcheck ist Voraussetzung fuer das Zero-Downtime-Update (deploy/update.sh)
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
