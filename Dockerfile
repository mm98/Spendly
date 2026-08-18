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
# The same commit the final stage stamps into /api/version, given to the bundle as well, so a
# tab already open can tell that the container has been replaced under it and offer to reload
# (react/src/components/UpdateNotice.jsx reads it, vite.config.js bakes it in). An ARG is
# per-stage, so the final stage's copy does not reach this one and it is declared twice on
# purpose. Unset, the bundle stamps null and the notice never fires -- the same "no build to be
# out of date" the endpoint answers with.
ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA
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
# The build stamp /api/version answers with, so the UI can say which image is running and a
# reader can compare it against the newest commit. Passed in as args -- .git is dockerignored,
# so the image cannot ask git itself -- and declared last, so a changing timestamp re-runs
# only this layer. Unset (a bare `docker build .`) they stamp nothing and the endpoint
# answers nulls, which the UI reads as an unstamped build.
ARG BUILD_TIME
ARG GIT_SHA
ENV SPENDLY_BUILD_TIME=$BUILD_TIME SPENDLY_BUILD_SHA=$GIT_SHA
# The Lighthouse scores this exact image was measured at, as the JSON blob
# react/scripts/lighthouse.mjs writes. Stamped rather than measured at runtime: the numbers
# describe a build, so they belong to the image the way its commit does, and a container asked
# to score itself would be measuring the box it happens to be running on. The workflow builds
# the image, runs Lighthouse against that container, and rebuilds with the result -- every
# layer above this one is cached, so the second pass is this ENV and nothing else. Unset, the
# endpoint answers null and the UI says the build was never measured.
ARG LIGHTHOUSE
ENV SPENDLY_LIGHTHOUSE=$LIGHTHOUSE
EXPOSE 4000
CMD ["node", "api/src/server.js"]
