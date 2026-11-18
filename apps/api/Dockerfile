# FeenGo API image. Build from the repository root, so the workspace files are in
# the context:
#
#   docker build -f apps/api/Dockerfile -t feengo-api .
#
# The image is for APP_ENV test, staging and production. It does not start with
# APP_ENV=local: local logging uses pino-pretty, a dev dependency that the image
# leaves out. For local development, run the API with pnpm (CLAUDE.md).
#
# Configuration comes only from environment variables at run time
# (docs/ARCHITECTURE.md section 19). No .env file is copied in (.dockerignore).
#
# Accepted for now: the base image is pinned by tag, not digest, as in section 17,
# and pnpm is installed with `npm i -g` at its exact version, with no integrity hash.

ARG NODE_IMAGE=node:26.13.1-alpine3.24

# --- Build: install every dependency, compile, then keep production ones only ---
FROM ${NODE_IMAGE} AS build
WORKDIR /repo

# pnpm at the exact version in the root package.json's packageManager field.
# Node 26 no longer ships corepack, so npm installs it.
COPY package.json ./
RUN npm install --global --no-fund --no-audit \
      "$(node -p "require('./package.json').packageManager.split('+')[0]")" \
    && pnpm --version

# Manifests first, so the install layer is reused until a dependency changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @feengo/api

COPY tsconfig.base.json ./
COPY apps/api/ apps/api/
RUN pnpm --filter @feengo/api build \
    && pnpm deploy --filter @feengo/api --prod /out

# --- Runtime: production dependencies, dist/ and package.json, as a non-root user ---
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Owned by root and read-only for the node user, which the API runs as.
COPY --from=build /out/node_modules ./node_modules
# The API reads its version from the package.json next to dist/.
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist

USER node
EXPOSE 3000

# PORT is set by the environment like every other variable; 3000 matches EXPOSE.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -T 3 -O /dev/null "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "dist/main.js"]
