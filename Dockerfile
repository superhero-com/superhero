# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# WalletConnect project id passed from GitHub Secrets via build args
ARG VITE_WALLET_CONNECT_PROJECT_ID
ENV VITE_WALLET_CONNECT_PROJECT_ID=$VITE_WALLET_CONNECT_PROJECT_ID
ARG VITE_X_OAUTH_CLIENT_ID
ENV VITE_X_OAUTH_CLIENT_ID=$VITE_X_OAUTH_CLIENT_ID
# WebAuthn RP ID for wallet passkeys — the custody boundary, baked at build time.
# Left unset it defaults to superhero.com, which is correct for production only;
# preview and staging images must pass their own registrable suffix or passkey
# registration fails with a SecurityError on that origin.
ARG VITE_WEBAUTHN_RP_ID
ENV VITE_WEBAUTHN_RP_ID=$VITE_WEBAUTHN_RP_ID

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
