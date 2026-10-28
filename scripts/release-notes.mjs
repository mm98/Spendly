// Usage: node scripts/release-notes.mjs [ref]
//
// Prints, as one line of JSON, the release notes of the newest versions on main up to `ref` (default
// HEAD), newest first: [{ version, notes: ["...", ...], reasons: ["...", ...] }]. reasons[i] says why
// notes[i] was made, or is empty for a note written before reasons were asked for; it is a list of its
// own so that an older app, which reads notes as text, still shows a newer image's notes. Each change
// adds one file to .releases/ (its README says how), and a file belongs to the version of the change
// on main that added it.
// A version with no file, or whose file says no change can be seen, has the one line NOTHING_TO_SEE.
// Versions older than the first note are left out: they had no notes, so the line would not be true. Needs the history's trees, not its
// files (a checkout with fetch-depth: 0 and filter: blob:none).

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { versionsOnMain } from "./version.mjs";

export const NOTES_FOLDER = ".releases";
// the folder's earlier names: a note added there is still the note of the change that added it
const EARLIER_NOTES_FOLDERS = ["release-notes"];
// "{yyyyMMdd}.{HHmm} - {Title}.md", the time written (UTC). No colon in the time and none of
// \ / : * ? " < > | in the title, since Windows cannot hold such a file and git cannot check it out there.
export const NOTE_NAME = /^\d{8}\.\d{4} - [^\s\\/:*?"<>|][^\\/:*?"<>|]*\.md$/;
// how far back Settings can look: the image carries this many versions
const VERSIONS_KEPT = 20;
const MAX_NOTES = 3;
const MAX_NOTE_LENGTH = 100;
const MAX_REASON_LENGTH = 200;
export const NOTHING_TO_SEE = "No change you can see.";

// words that describe how the app is built, not what the reader sees or can do
const TECHNICAL = /\b(api|endpoint|component|react|css|html|json|sql|database|query|queries|refactor\w*|pull request|commit|branch|merge|deploy\w*|server|route|props?|storybook|docker|bug|regression|ui|ux|frontend|backend|null|undefined|cache|schema|migration)\b/i;
const FILE_NAME = /\b[\w-]+\.(jsx?|mjs|css|html|json|md|sql|sqlite3|ya?ml)\b/i;

/** A file's text as its notes, each note's reason at the same place in `reasons` (empty when it has
    none), and what in it breaks the writing rule: { notes, reasons, faults }. */
export function readNote(text) {
	const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
	if (lines.length === 1 && lines[0] === NOTHING_TO_SEE) return { notes: [], reasons: [], faults: [] };
	const faults = [];
	if (!lines.length) faults.push(`it is empty: write up to ${MAX_NOTES} changes, each a line starting "- " and a line under it saying why, or the line "${NOTHING_TO_SEE}"`);
	// a line starting "- " is a change; the lines under it, up to the next change, are its reason
	const changes = [];
	for (const line of lines) {
		if (line.startsWith("- ")) changes.push({ note: line.slice(2).trim(), reason: [] });
		else if (changes.length) changes.at(-1).reason.push(line);
		else faults.push(`"${line}" comes before the first change; a change starts with "- "`);
	}
	if (changes.length > MAX_NOTES) faults.push(`it has ${changes.length} changes, and at most ${MAX_NOTES} are shown`);
	const plain = text => {
		if (/[–—]/.test(text)) faults.push(`"${text}" has a long dash; use a plain hyphen or a full stop`);
		if (text.includes("`")) faults.push(`"${text}" has a backtick`);
		const word = text.match(TECHNICAL)?.[0] ?? text.match(FILE_NAME)?.[0];
		if (word) faults.push(`"${text}" says "${word}", which describes how the app is built; say what the reader sees or can do`);
	};
	for (const change of changes) {
		change.reason = change.reason.join(" ");
		if (change.note.length > MAX_NOTE_LENGTH) faults.push(`"${change.note}" is longer than ${MAX_NOTE_LENGTH} characters`);
		if (!change.reason) faults.push(`"${change.note}" has no reason: under it, write a line saying why it was made`);
		if (change.reason.length > MAX_REASON_LENGTH) faults.push(`the reason "${change.reason}" is longer than ${MAX_REASON_LENGTH} characters`);
		plain(change.note);
		if (change.reason) plain(change.reason);
	}
	return { notes: changes.map(({ note }) => note), reasons: changes.map(({ reason }) => reason), faults };
}

// core.quotePath=false: a name with a letter outside ASCII is printed as it is, not quoted
const git = args => execFileSync("git", ["-c", "core.quotePath=false", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });

/** The notes of the newest versions up to `ref`, newest first. */
export function releaseNotes(ref = "HEAD") {
	const folders = [NOTES_FOLDER, ...EARLIER_NOTES_FOLDERS];
	const paths = folders.flatMap(folder => [`${folder}/*.md`, `:!${folder}/README.md`]);
	// --diff-merges=first-parent: a merge commit lists what the merge brought into main. With renames
	// found, a moved note is a rename and not a new note, so it keeps the version that added it.
	const history = (...options) => git(["log", "--first-parent", "--diff-merges=first-parent", "--find-renames",
		...options, ref, "--", ...paths]);
	const log = history("--diff-filter=A", "--name-only", "--format=%x1e%H");
	const filesOf = new Map(log.split("\x1e").slice(1).map(entry => {
		const [commit, ...files] = entry.trim().split("\n");
		return [commit, files.filter(Boolean)];
	}));
	// where each moved note went, so it is read where it is at `ref`
	const movedTo = new Map(history("--diff-filter=R", "--name-status", "--format=").split("\n").filter(Boolean)
		.map(line => line.split("\t").slice(1)));
	const pathAtRef = file => {
		for (let moves = 0; movedTo.has(file) && moves < movedTo.size; moves++) file = movedTo.get(file);
		return file;
	};
	const onMain = versionsOnMain(ref);
	const first = onMain.findIndex(({ commit }) => filesOf.has(commit));
	if (first < 0) return [];
	const versions = [];
	for (const { commit, version } of onMain.slice(first).reverse()) {
		if (versions.length === VERSIONS_KEPT) break;
		// the text as it is at `ref`, so a note corrected later is shown corrected
		const read = (filesOf.get(commit) ?? []).map(file => {
			try { return readNote(git(["show", `${ref}:${pathAtRef(file)}`])) } catch { return { notes: [], reasons: [] } }
		});
		const notes = read.flatMap(note => note.notes);
		const reasons = read.flatMap(note => note.reasons);
		versions.push(notes.length ? { version, notes, reasons } : { version, notes: [NOTHING_TO_SEE], reasons: [""] });
	}
	return versions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	console.log(JSON.stringify(releaseNotes(process.argv[2] || "HEAD")));
}
