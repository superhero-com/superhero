# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for node-gyp
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci
COPY . .

RUN npm run build

# Production dependencies stage
# Serve stage (Node SEO injector)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
# Convert dev install to production without reinstalling
RUN npm prune --omit=dev
COPY server ./server
ENV NODE_ENV=production
EXPOSE 80
CMD ["node", "server/index.cjs"]
