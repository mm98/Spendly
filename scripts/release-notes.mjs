// Usage: node scripts/release-notes.mjs [ref]
//
// Prints, as one line of JSON, the release notes of the newest versions on main up to `ref` (default
// HEAD), newest first: [{ version, notes: ["...", ...] }]. Each change adds one file to .releases/
// (its README says how), and a file belongs to the version of the change on main that added it.
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
export const NOTHING_TO_SEE = "No change you can see.";

// words that describe how the app is built, not what the reader sees or can do
const TECHNICAL = /\b(api|endpoint|component|react|css|html|json|sql|database|query|queries|refactor\w*|pull request|commit|branch|merge|deploy\w*|server|route|props?|storybook|docker|bug|regression|ui|ux|frontend|backend|null|undefined|cache|schema|migration)\b/i;
const FILE_NAME = /\b[\w-]+\.(jsx?|mjs|css|html|json|md|sql|sqlite3|ya?ml)\b/i;

/** A file's text as its notes, and what in it breaks the writing rule: { notes, faults }. */
export function readNote(text) {
	const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
	if (lines.length === 1 && lines[0] === NOTHING_TO_SEE) return { notes: [], faults: [] };
	const faults = [];
	if (!lines.length) faults.push(`it is empty: write up to ${MAX_NOTES} lines starting "- ", or the line "${NOTHING_TO_SEE}"`);
	if (lines.length > MAX_NOTES) faults.push(`it has ${lines.length} lines, and at most ${MAX_NOTES} are shown`);
	const notes = lines.map(line => {
		if (!line.startsWith("- ")) faults.push(`"${line}" does not start with "- "`);
		const note = line.replace(/^-\s*/, "");
		if (note.length > MAX_NOTE_LENGTH) faults.push(`"${note}" is longer than ${MAX_NOTE_LENGTH} characters`);
		if (/[–—]/.test(note)) faults.push(`"${note}" has a long dash; use a plain hyphen or a full stop`);
		if (note.includes("`")) faults.push(`"${note}" has a backtick`);
		const word = note.match(TECHNICAL)?.[0] ?? note.match(FILE_NAME)?.[0];
		if (word) faults.push(`"${note}" says "${word}", which describes how the app is built; say what the reader sees or can do`);
		return note;
	});
	return { notes, faults };
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
		const notes = (filesOf.get(commit) ?? []).flatMap(file => {
			try { return readNote(git(["show", `${ref}:${pathAtRef(file)}`])).notes } catch { return [] }
		});
		versions.push({ version, notes: notes.length ? notes : [NOTHING_TO_SEE] });
	}
	return versions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	console.log(JSON.stringify(releaseNotes(process.argv[2] || "HEAD")));
}
