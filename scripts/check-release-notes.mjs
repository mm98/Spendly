// Usage: node scripts/check-release-notes.mjs [baseRef]
//
// A change that reaches what the user sees adds one file to release-notes/, written by the rule in
// its README. Scoped to the diff, like check-comments.mjs: a note already on main is never checked again.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { NOTES_FOLDER, NOTHING_TO_SEE, readNote } from "./release-notes.mjs";

// what is built into the image the user runs; a change only elsewhere needs no note
const REACHES_THE_USER = ["api/", "react/", "Dockerfile"];

const baseRef = process.argv[2] || process.env.CHECK_BASE_SHA || "origin/main";
const mergeBase = execFileSync("git", ["merge-base", baseRef, "HEAD"], { encoding: "utf8" }).trim();
// against the working tree, so uncommitted work is checked too; a new file needs `git add` first
const changed = execFileSync("git", ["diff", "--name-status", "--no-renames", mergeBase], { encoding: "utf8" })
	.split("\n").filter(Boolean).map(line => line.split("\t"));

const isNote = file => file.startsWith(`${NOTES_FOLDER}/`) && file.endsWith(".md") && file !== `${NOTES_FOLDER}/README.md`;
const added = changed.filter(([status, file]) => status === "A" && isNote(file)).map(([, file]) => file);
const written = changed.filter(([status, file]) => status !== "D" && isNote(file)).map(([, file]) => file);
const reaches = changed.some(([, file]) => REACHES_THE_USER.some(path => file.startsWith(path)));

let failures = 0;
const fail = message => { failures++; console.error(message) };

if (reaches && !added.length) {
	fail(`This change reaches the app but adds no file to ${NOTES_FOLDER}/. Add one, named like the branch, `
		+ `with up to three lines starting "- " that say what the reader can now do or see, or the line "${NOTHING_TO_SEE}"`);
}
if (added.length > 1) fail(`This change adds ${added.length} files to ${NOTES_FOLDER}/; one change is one version, so write one file.`);
for (const file of written) {
	for (const fault of readNote(readFileSync(file, "utf8")).faults) fail(`${file}: ${fault}`);
}

if (failures) process.exit(1);
console.log(added.length ? `${added[0]} follows the rule.` : "No release note is needed for this change.");
