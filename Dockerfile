# ==========================================================================
# spacepope.ai — Dockerfile · v1.0 — 15JUL2026
# --------------------------------------------------------------------------
# Two-stage rite: the scriptorium (node) illuminates the manuscript, then
# the manuscript alone moves to the reading room (nginx). No model touches
# this build; the site is rendered from what the press already committed.
# ==========================================================================

# --- Stage 1: the scriptorium --------------------------------------------
FROM node:22-alpine AS build
WORKDIR /work
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: the reading room --------------------------------------------
FROM nginx:alpine
COPY --from=build /work/dist /usr/share/nginx/html
# Astro emits a 404.html; teach the reading room to offer it politely.
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  error_page 404 /404.html;\n  location / { try_files $uri $uri/ =404; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
