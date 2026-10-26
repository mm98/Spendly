// Usage: node scripts/version.mjs [ref]
//
// Prints Spendly's version, major.minor, for a commit on main (default HEAD). It is counted from
// the history, so it is never written by hand and two pull requests cannot claim the same number:
// - major is how many changes on main carry "[major]" in their pull request title,
// - minor is how many changes have landed on main since the newest of those.
// Needs the full history of main (a checkout with fetch-depth: 0).

import { execFileSync } from "node:child_process";

const ref = process.argv[2] || "HEAD";

const MAJOR = /\[major\]/i;

// %x1f and %x1e split fields and commits, since a title or body can hold any printable text
const log = execFileSync("git", ["log", "--first-parent", "--format=%s%x1f%b%x1e", ref],
	{ encoding: "utf8", maxBuffer: 1 << 28 });

const titles = log.split("\x1e").slice(0, -1).map(entry => {
	const [subject, body] = entry.replace(/^\n/, "").split("\x1f");
	// a merge commit carries the pull request's title on the body's first line; a squash, in its subject
	return subject.startsWith("Merge pull request #") ? (body.split("\n").find(line => line.trim()) ?? "") : subject;
});

const newestMajor = titles.findIndex(title => MAJOR.test(title));
const major = titles.filter(title => MAJOR.test(title)).length;
const minor = newestMajor === -1 ? titles.length : newestMajor;

console.log(`${major}.${minor}`);
