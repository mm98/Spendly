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
# source build when its prebuilt binary can't be fetched, and alpine has no python/g++ of its
# own. Only node_modules is copied out, so none of the toolchain reaches the final image.
# Alpine over bookworm-slim here and below: musl instead of glibc cuts the base layer roughly
# in half, and sharp and better-sqlite3 both publish musl prebuilds precisely for this image,
# so nothing has to compile from source to get them.
FROM node:22-alpine AS apideps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY api/package.json api/package-lock.json api/
RUN npm --prefix api ci --omit=dev
# sharp and better-sqlite3 ship prebuilt binaries for every platform as npm optionalDependencies,
# and npm's os/cpu filter can't tell glibc from musl on packages that predate the "libc" field --
# so a musl install on this image still pulls the glibc build too, plus sharp's universal wasm
# fallback, plus better-sqlite3's build-only C++ source and every other OS's .node file. None of
# it runs on this musl/x64 image; keeping only what require() actually resolves here took
# api/node_modules from 93M to under 40M on the equivalent glibc build, run outside Docker with
# a plain `npm ci` (this sandbox could not pull the base image to build the real thing -- verify
# this stage builds and `node -e "require(...)"` still passes before trusting it). Version bumps
# that change a prebuild's filename just make a line here a no-op, not a break -- the require()
# at the end of this stage is what catches that.
RUN find api/node_modules/@img -maxdepth 1 -mindepth 1 -type d \
		! -name 'sharp-linuxmusl-x64' ! -name 'sharp-libvips-linuxmusl-x64' ! -name 'colour' \
		-exec rm -rf {} + \
	&& find api/node_modules/better-sqlite3/prebuilds -type f ! -name 'linuxmusl-x64.node' -delete \
	&& rm -rf api/node_modules/better-sqlite3/deps api/node_modules/better-sqlite3/src \
		api/node_modules/better-sqlite3/build api/node_modules/better-sqlite3/binding.gyp \
	&& find api/node_modules -name '*.br' -delete \
	&& node -e "require('./api/node_modules/sharp'); require('./api/node_modules/better-sqlite3')"

FROM node:22-alpine
ENV NODE_ENV=production
# The musl prebuilds above are dynamically linked against libstdc++, which alpine's base image
# does not carry -- only glibc-only images ship it by default. Without this the container starts
# and fails on the first sharp or better-sqlite3 call with "Error loading shared library
# libstdc++.so.6", not on boot, which is the failure mode this line exists to rule out.
RUN apk add --no-cache libstdc++
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
