# Dependency and build images share an immutable Node/Alpine base.
FROM node:22.23.3-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS base

# Only Express and its locked dependency tree are needed by the HTTP server.
FROM base AS server-dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

FROM base AS builder
WORKDIR /app

# Git-backed packages and node-gyp are build-time dependencies only.
COPY docker/web-build-apk.lock /tmp/web-build-apk.lock
RUN apk add --no-cache $(grep -v '^#' /tmp/web-build-apk.lock)

ARG VITE_X_OAUTH_CLIENT_ID
ENV VITE_X_OAUTH_CLIENT_ID=$VITE_X_OAUTH_CLIENT_ID
# WebAuthn RP ID for wallet passkeys — the custody boundary, baked at build time.
# Left unset it defaults to superhero.com, which is correct for production only;
# preview and staging images must pass their own registrable suffix or passkey
# registration fails with a SecurityError on that origin.
ARG VITE_WEBAUTHN_RP_ID
ENV VITE_WEBAUTHN_RP_ID=$VITE_WEBAUTHN_RP_ID

ARG VITE_SUPERHERO_API_URL
ENV VITE_SUPERHERO_API_URL=$VITE_SUPERHERO_API_URL
ARG VITE_SUPERHERO_WS_URL
ENV VITE_SUPERHERO_WS_URL=$VITE_SUPERHERO_WS_URL

ARG VITE_NETWORK=ae_mainnet
ENV VITE_NETWORK=$VITE_NETWORK
ARG ENABLE_SHORTS=false
ENV ENABLE_SHORTS=$ENABLE_SHORTS
ARG VITE_SHORTS_API_URL
ENV VITE_SHORTS_API_URL=$VITE_SHORTS_API_URL
ARG VITE_SHORTS_RELEASE_HASH
ENV VITE_SHORTS_RELEASE_HASH=$VITE_SHORTS_RELEASE_HASH
ARG VITE_SHORTS_STREAM_URL
ENV VITE_SHORTS_STREAM_URL=$VITE_SHORTS_STREAM_URL

COPY package.json package-lock.json ./
COPY scripts ./scripts
# CI already provides this optional BuildKit secret. It is scoped to GitHub
# requests in this RUN, never written to a Git URL, config file or image ENV.
RUN --mount=type=secret,id=GITHUB_TOKEN \
    export GIT_CONFIG_COUNT=2 \
      GIT_CONFIG_KEY_0=url.https://github.com/.insteadOf \
      GIT_CONFIG_VALUE_0=ssh://git@github.com/ \
      GIT_CONFIG_KEY_1=url.https://github.com/.insteadOf \
      GIT_CONFIG_VALUE_1=git@github.com: \
    && if [ -s /run/secrets/GITHUB_TOKEN ]; then \
      export GIT_CONFIG_COUNT=3 \
        GIT_CONFIG_KEY_2=http.https://github.com/.extraHeader \
        GIT_CONFIG_VALUE_2="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$(cat /run/secrets/GITHUB_TOKEN)" | base64 | tr -d '\n')"; \
    fi \
    && npm ci --no-audit --no-fund \
    && npm cache clean --force
COPY . .

# Keep Vite within a bounded heap on small builders; dedicated CI can override it.
ARG BUILD_NODE_OPTIONS=--max-old-space-size=1152
RUN NODE_OPTIONS="$BUILD_NODE_OPTIONS" npm run build

# The runtime contains no frontend tooling, compilers, Git or package manager.
FROM base AS runtime
RUN apk add --no-cache zlib=1.3.2-r1 \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=server-dependencies /app/server ./server
COPY server/index.cjs ./server/index.cjs
COPY server/lib/*.cjs ./server/lib/
ENV NODE_ENV=production PORT=80
USER node
EXPOSE 80
CMD ["node", "server/index.cjs"]
