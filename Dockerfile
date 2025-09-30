# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for node-gyp
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM caddy:2-alpine
WORKDIR /srv
COPY --from=builder /app/dist /srv

# Dump Caddyfile
RUN echo ":80 {\n\
  root * /srv\n\
  file_server\n\
  rewrite * /index.html\n\
}" > /etc/caddy/Caddyfile

EXPOSE 80
CMD ["caddy", "run"]
