# ==============================================================================
# Multi-stage production Dockerfile for Railway (Node 22 + Caddy 2)
# Follows Railway's official React/Vite deployment guide:
# https://railway.com/guides/react
# ==============================================================================

FROM node:22-alpine AS build

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

WORKDIR /app

# Declare Vite build-time environment variables (Railway injects service vars as ARGs)
ARG VITE_APP_NAME="کالری‌شمار روزمره"
ARG VITE_SITE_URL=""
ARG VITE_DEFAULT_DAILY_KCAL=2000
ARG VITE_DEFAULT_WATER_GOAL_GLASSES=8
ARG VITE_ENABLE_PWA=true
ARG VITE_REPO_URL="https://github.com/persian25511-cyber/calorie-traker"

ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_DEFAULT_DAILY_KCAL=$VITE_DEFAULT_DAILY_KCAL
ENV VITE_DEFAULT_WATER_GOAL_GLASSES=$VITE_DEFAULT_WATER_GOAL_GLASSES
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA
ENV VITE_REPO_URL=$VITE_REPO_URL

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# ==============================================================================
# Runtime Stage: Lightweight Caddy 2 static SPA server
# ==============================================================================
FROM caddy:2-alpine AS runner

WORKDIR /app

COPY Caddyfile /app/Caddyfile
RUN caddy fmt /app/Caddyfile --overwrite

COPY --from=build /app/dist /app/dist

EXPOSE 3000

CMD ["caddy", "run", "--config", "/app/Caddyfile", "--adapter", "caddyfile"]
