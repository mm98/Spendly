// Usage: node scripts/version.mjs [ref]
//
// Prints Spendly's version, major.minor.build, for a commit on main (default HEAD). It is counted
// from the history, so it is never written by hand and two pull requests cannot claim the same number.
// Each change on main, oldest first, raises one part and sets the parts after it to 0:
// - "[major]" in its pull request title raises major,
// - "[minor]" raises minor,
// - anything else raises build.
// Needs the full history of main (a checkout with fetch-depth: 0). Reads commit messages only, so a
// checkout without files or trees (filter: tree:0) is enough.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAJOR = /\[major\]/i;
const MINOR = /\[minor\]/i;

// The first pull request counted in three parts. Changes on main before the first one numbered this or
// higher were counted in two parts, where every change raised minor; changing it renumbers every version.
const FIRST_THREE_PART_PULL_REQUEST = 606;

/** Every change on main up to `ref`, oldest first: [{ commit, version }]. */
export function versionsOnMain(ref = "HEAD") {
	// %x1f and %x1e split fields and commits, since a title or body can hold any printable text
	const log = execFileSync("git", ["log", "--first-parent", "--reverse", "--format=%H%x1f%s%x1f%b%x1e", ref],
		{ encoding: "utf8", maxBuffer: 1 << 28 });

	const changes = log.split("\x1e").slice(0, -1).map(entry => {
		const [commit, subject, body] = entry.replace(/^\n/, "").split("\x1f");
		// a merge commit carries the pull request's title on the body's first line; a squash, in its subject
		const merge = subject.match(/^Merge pull request #(\d+)/);
		const title = merge ? (body.split("\n").find(line => line.trim()) ?? "") : subject;
		const pullRequest = merge ? Number(merge[1]) : Number(subject.match(/\(#(\d+)\)\s*$/)?.[1] ?? 0);
		return { commit, title, pullRequest };
	});

	let major = 0, minor = 0, build = 0, threeParts = false;
	return changes.map(({ commit, title, pullRequest }) => {
		threeParts ||= pullRequest >= FIRST_THREE_PART_PULL_REQUEST;
		if (MAJOR.test(title)) [major, minor, build] = [major + 1, 0, 0];
		else if (MINOR.test(title) || !threeParts) [minor, build] = [minor + 1, 0];
		else build += 1;
		return { commit, version: `${major}.${minor}.${build}` };
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	console.log(versionsOnMain(process.argv[2] || "HEAD").at(-1)?.version ?? "0.0.0");
}
