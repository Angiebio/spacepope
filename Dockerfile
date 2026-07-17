# ==========================================================================
# spacepope.ai — Dockerfile · v1.1 — 17JUL2026
# --------------------------------------------------------------------------
# Two-stage rite: the scriptorium (node) illuminates the manuscript, then
# the manuscript alone moves to the reading room (nginx). No model touches
# this build; the site is rendered from what the press already committed.
# v1.1: the reading room learns thrift — gzip on the wire, and a long
# memory for /_astro/ (Astro fingerprints those files, so a year of
# immutable cache is not faith, it is arithmetic; the HTML itself stays
# no-cache, because the press prints daily and the front page must not lag).
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
# gzip note: nginx always compresses text/html when gzip is on, so listing
# it in gzip_types would only earn a duplicate-MIME warning; the css/js/svg
# types are the ones that need naming.
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  error_page 404 /404.html;\n\
\n\
  gzip on;\n\
  gzip_types text/css application/javascript image/svg+xml;\n\
  gzip_min_length 1k;\n\
\n\
  # fingerprinted assets: cache like scripture, immutable for a year\n\
  location /_astro/ {\n\
    add_header Cache-Control "public, max-age=31536000, immutable";\n\
  }\n\
\n\
  # everything else (html, favicons): revalidate every visit\n\
  location / {\n\
    add_header Cache-Control "no-cache";\n\
    try_files $uri $uri/ =404;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
