# Spendly in one container: stage 1 builds the React app, stage 2 runs the Express API,
# which serves react/dist itself (api/src/app.js) -- the same one-process shape as
# render.yaml, so there is no cross-origin cookie configuration to get right.
#
# All persistent state -- orders, accounts, uploaded receipts -- lives in the one SQLite
# file at $SPENDLY_DB. Mount a volume over /data (docker-compose.yml does) or the data
# dies with the container.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY react/package.json react/package-lock.json react/
# --include=dev regardless of NODE_ENV: vite is a devDependency and is the build.
RUN npm --prefix react ci --include=dev
COPY react react
RUN npm --prefix react run build

# api deps in their own stage with a toolchain: better-sqlite3 falls back to a node-gyp
# source build when its prebuilt binary can't be fetched, and slim has no python/g++.
# Only node_modules is copied out, so none of the toolchain reaches the final image.
FROM node:22-bookworm-slim AS apideps
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY api/package.json api/package-lock.json api/
RUN npm --prefix api ci --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY api api
COPY --from=apideps /app/api/node_modules api/node_modules
COPY --from=build /app/react/dist react/dist
ENV SPENDLY_DB=/data/spendly.sqlite3
EXPOSE 4000
CMD ["node", "api/src/server.js"]
