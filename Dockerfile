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
FROM nginx:1.25-alpine
WORKDIR /srv
COPY --from=builder /app/dist /usr/share/nginx/html
RUN cp /usr/share/nginx/html/index.html /usr/share/nginx/html/index.template.html
COPY docker/override-env.sh /docker-entrypoint.d/99-override-env.sh
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN apk add --no-cache gettext && chmod +x /docker-entrypoint.d/99-override-env.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
