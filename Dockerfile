# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for node-gyp
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage (Node SEO injector)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server ./server
ENV NODE_ENV=production
EXPOSE 80
CMD ["node", "server/index.js"]
