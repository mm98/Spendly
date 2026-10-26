# Spendly in one container: stage 1 builds the React app, stage 2 runs the Express API,
# which serves react/dist itself (api/src/app.js) -- the same one-process shape as
# render.yaml, so there is no cross-origin cookie configuration to get right.
#
# All persistent state -- orders, accounts, uploaded receipts -- lives in the one SQLite
# file at $SPENDLY_DB. Mount a volume over /data (docker-compose.yml does) or the data
# dies with the container. The files Ask makes live in $SPENDLY_STORAGE, outside the
# database and its backup; without a volume over /storage they go with the container.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY react/package.json react/package-lock.json react/
# --include=dev regardless of NODE_ENV: vite is a devDependency and is the build.
RUN npm --prefix react ci --include=dev
COPY react react
# the commit and version are baked into the bundle too, so an open tab can see the server was updated
# under it and which versions it missed; an ARG is per stage, so the final stage declares its own
ARG GIT_SHA
ARG VERSION
ENV GIT_SHA=$GIT_SHA VERSION=$VERSION
RUN npm --prefix react run build

# The Storybook, served at /storybook. It builds from react/'s own packages, installed above.
FROM build AS storybook
COPY storybook/package.json storybook/package-lock.json storybook/
RUN npm --prefix storybook ci
COPY storybook storybook
RUN npm --prefix storybook run build

# api deps in their own stage with a toolchain: better-sqlite3 falls back to a node-gyp
# source build when its prebuilt binary can't be fetched, and slim has no python/g++.
# Only node_modules is copied out, so none of the toolchain reaches the final image.
FROM node:22-bookworm-slim AS apideps
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY api/package.json api/package-lock.json api/
# onnxruntime-node ships its CPU build in the package; its install script only fetches GPU extras
ENV ONNXRUNTIME_NODE_INSTALL=skip
# the browser build and the other platforms' binaries are never run here
RUN npm --prefix api ci --omit=dev \
	&& rm -rf api/node_modules/onnxruntime-web api/node_modules/onnxruntime-node/bin/napi-v6/darwin api/node_modules/onnxruntime-node/bin/napi-v6/win32

# The language model category suggestions use, fetched once and kept as its own layer: it changes
# only with api/model.json, not with the code. The app never downloads it while it runs.
FROM apideps AS model
COPY api/model.json api/model.json
COPY api/scripts/fetch-model.mjs api/scripts/fetch-model.mjs
RUN SPENDLY_MODEL_DIR=/app/models node api/scripts/fetch-model.mjs

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY api api
COPY --from=apideps /app/api/node_modules api/node_modules
COPY --from=model /app/models models
ENV SPENDLY_MODEL_DIR=/app/models
COPY --from=build /app/react/dist react/dist
COPY --from=storybook /app/storybook/dist storybook/dist
ENV SPENDLY_DB=/data/spendly.sqlite3
ENV SPENDLY_STORAGE=/storage
# The build stamp /api/version answers with, so the UI can say which image is running and a
# reader can compare it against the newest commit. Passed in as args -- .git is dockerignored,
# so the image cannot ask git itself -- and declared last, so a changing timestamp re-runs
# only this layer. Unset (a bare `docker build .`) they stamp nothing and the endpoint
# answers nulls, which the UI reads as an unstamped build.
ARG BUILD_TIME
ARG GIT_SHA
# major.minor.build, counted by scripts/version.mjs
ARG VERSION
ENV SPENDLY_BUILD_TIME=$BUILD_TIME SPENDLY_BUILD_SHA=$GIT_SHA SPENDLY_VERSION=$VERSION
# The Lighthouse scores this exact image was measured at, as the JSON blob
# react/scripts/lighthouse.mjs writes. Stamped rather than measured at runtime: the numbers
# describe a build, so they belong to the image the way its commit does, and a container asked
# to score itself would be measuring the box it happens to be running on. The workflow builds
# the image, runs Lighthouse against that container, and rebuilds with the result -- every
# layer above this one is cached, so the second pass is this ENV and nothing else. Unset, the
# endpoint answers null and the UI says the build was never measured.
ARG LIGHTHOUSE
ENV SPENDLY_LIGHTHOUSE=$LIGHTHOUSE
# What changed in the newest versions, as scripts/release-notes.mjs prints it. In the image's own
# settings, so a server on an older version can read the newer version's notes from the registry.
ARG RELEASE_NOTES
ENV SPENDLY_RELEASE_NOTES=$RELEASE_NOTES
EXPOSE 4000
CMD ["node", "api/src/server.js"]
