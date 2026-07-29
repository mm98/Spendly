#!/bin/bash
# Spendly session setup -- guarantee all three Playwright engines are present.
# CLAUDE.md treats Blink/Gecko/WebKit as a given; this is what makes that true.
# It must fail loudly: a silent miss costs a whole session's cross-engine coverage.
set -uo pipefail

PW_VERSION=1.56.1
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
STATUS=/opt/pw-browsers/SETUP_STATUS.txt
QUARANTINE=/opt/apt-quarantine

mkdir -p /opt/pw-browsers

echo "=== Playwright ${PW_VERSION} browser setup ==="

# Installing is not the same as launching. Launch each engine and report the
# version it actually reports, so a half-extracted bundle cannot pass as present.
# This is the only check that decides whether the session has its engines --
# every exit code above it is a hint about why, never a verdict on whether.
launch_check() {
	echo "=== launch check ==="
	LAUNCH_REPORT=$(node -e '
const pw = require("/opt/node22/lib/node_modules/playwright");
(async () => {
	let bad = 0;
	for (const name of ["chromium", "firefox", "webkit"]) {
		try {
			const b = await pw[name].launch();
			const p = await b.newPage();
			await p.goto("about:blank");
			console.log(name.padEnd(9) + "OK    " + b.version());
			await b.close();
		} catch (e) {
			bad++;
			console.log(name.padEnd(9) + "FAIL  " + e.message.split("\n")[0]);
		}
	}
	process.exit(bad);
})();
' 2>&1)
	LAUNCH_EXIT=$?
	echo "$LAUNCH_REPORT"
}

# The version line is first because the fast path below reads it back to decide
# whether the cache on disk is the cache this script is pinned to.
write_status() {
	{
		echo "playwright ${PW_VERSION}"
		echo "apt exit: ${1}"
		echo "install exit: ${2}"
		echo "install-deps exit: ${3}"
		echo "engines failing to launch: ${LAUNCH_EXIT}"
		echo "$LAUNCH_REPORT"
	} > "$STATUS"
}

# A warm /opt/pw-browsers used to be re-installed over regardless, and the cost
# is the whole of a session's start: boot to status file measured 87 seconds.
# Only chromium is baked into the base image -- chromium-1194/ keeps its build
# mtime through a run of 'install chromium firefox webkit', because playwright
# skips a browser already on disk and does not touch it, while firefox-1495/ and
# webkit-2215/ are created during the boot that fetches them. So the minute is
# Gecko and WebKit being downloaded and extracted, and it is unavoidable on a
# cold cache -- but /opt/pw-browsers is one directory on the root filesystem, so
# when the environment cache restores it warm the engines and this status file
# come back together and there is nothing left to fetch. Launch them first and
# skip the install when they answer; fall through and pay the download when they
# do not. The skip is safe because the check being reused is the same one that
# has the final say at the bottom of this script, not a weaker stand-in for it.
#
# The version guard is not decoration. The launch check drives the globally
# installed playwright, which is pinned to the image rather than to PW_VERSION,
# so after a bump here it would happily launch the PREVIOUS bundle's browsers
# off the cache and report OK three times. Requiring the recorded version to
# match is what stops a version bump from silently never installing anything.
if [ -f "$STATUS" ] && [ "$(head -1 "$STATUS")" = "playwright ${PW_VERSION}" ]; then
	echo "cache reports playwright ${PW_VERSION} -- verifying before skipping install"
	launch_check
	if [ $LAUNCH_EXIT -eq 0 ]; then
		write_status "skipped (cache warm)" "skipped (cache warm)" "skipped (cache warm)"
		echo "All three engines launch from cache. Status written to ${STATUS}"
		exit 0
	fi
	echo "${LAUNCH_EXIT} engine(s) did not launch from cache -- running the full install"
fi

# The proxy 403s third-party apt repositories that are not on this environment's
# allowlist -- deadsnakes and ondrej/php ship in the base image and neither has
# anything to do with browsers. apt exits 100 on any unreachable repo, so those
# two 403s used to abort 'install --with-deps' before a single browser byte was
# fetched. Park whatever apt actually names as unreachable and leave it parked
# for the session -- a 403 is the gateway's allowlist and never a transient, so
# putting the file back only re-arms this failure for the next apt call. The
# files move rather than being deleted; the path is printed so it is reversible.
# Nothing here decides in advance which repo is at fault: it reads the failure.
quarantine_unreachable_repos() {
	local out hosts host file
	out=$(apt-get update 2>&1)
	if [ $? -eq 0 ]; then
		echo "apt-get update: OK, all repositories reachable"
		return 0
	fi

	# 'E: Failed to fetch https://host/path/dists/... 403 Forbidden' -- take the
	# host out of each one and disable every source file that mentions it.
	hosts=$(echo "$out" | grep -oE '^E: Failed to fetch [a-z]+://[^/]+' \
		| sed -E 's#^E: Failed to fetch [a-z]+://##' | sort -u)

	if [ -z "$hosts" ]; then
		echo "!!! apt-get update failed and named no unreachable host:"
		echo "$out" | tail -20
		return 1
	fi

	mkdir -p "$QUARANTINE"
	for host in $hosts; do
		echo "apt: ${host} unreachable -- quarantining its source files to ${QUARANTINE}"
		for file in $(grep -rlF "$host" /etc/apt/sources.list.d/ 2>/dev/null); do
			echo "  - $(basename "$file")  (restore: mv ${QUARANTINE}/$(basename "$file") /etc/apt/sources.list.d/)"
			mv "$file" "$QUARANTINE"/
		done
	done

	apt-get update 2>&1 | tail -3
	return ${PIPESTATUS[0]}
}

quarantine_unreachable_repos
APT_EXIT=$?
echo "apt preparation exit: ${APT_EXIT}"

# Download and dependency install are two commands, not '--with-deps', and the
# order matters. --with-deps installs deps FIRST and aborts the whole run if apt
# is unhappy, so an apt problem cost us the browsers too. Downloading first means
# a later deps failure still leaves three engines on disk, and the launch check
# below -- not apt's exit code -- is what decides whether they are usable.
npx --yes "playwright@${PW_VERSION}" install chromium firefox webkit
INSTALL_EXIT=$?
echo "browser download exit: ${INSTALL_EXIT}"

# WebKit is the one that needs this: without its system libraries it fails at
# launch on about thirty missing shared objects and no re-run explains why.
npx --yes "playwright@${PW_VERSION}" install-deps chromium firefox webkit
DEPS_EXIT=$?
echo "dependency install exit: ${DEPS_EXIT}"

if [ $INSTALL_EXIT -ne 0 ] || [ $DEPS_EXIT -ne 0 ]; then
	# A bare 'Download failure, code=1' names no host and no cause. The proxy
	# records what was actually refused -- print it rather than guessing.
	echo "--- agent proxy status ---"
	# ':-' guards this: the init-script environment does not always carry
	# HTTPS_PROXY, and under 'set -u' the diagnostic then killed the script
	# instead of diagnosing it. Fall back to the lowercase spelling.
	PROXY="${HTTPS_PROXY:-${https_proxy:-}}"
	if [ -n "$PROXY" ]; then
		curl -sS "${PROXY}/__agentproxy/status" || echo "(proxy status unavailable)"
	else
		echo "(no HTTPS_PROXY/https_proxy set in this environment)"
	fi
fi

launch_check
write_status "$APT_EXIT" "$INSTALL_EXIT" "$DEPS_EXIT"

if [ $LAUNCH_EXIT -ne 0 ]; then
	echo "!!! ${LAUNCH_EXIT} engine(s) unavailable -- cross-engine checks CANNOT be claimed this session."
	echo "!!! See ${STATUS}"
	exit 1
fi

echo "All three engines launch. Status written to ${STATUS}"
