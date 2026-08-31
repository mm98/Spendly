// Usage: node scripts/check-comments.mjs [baseRef]
//
// CLAUDE.md's Comments rule, made mechanical, and scoped to the diff rather than the whole
// tree: only comment lines a PR actually adds or changes are checked, so an existing long
// comment nobody touched never fails a run it has nothing to do with -- the same "reports only
// what changed" shape as api/scripts/check-queries.mjs.

import { execFileSync } from "node:child_process";

const MAX_NEW_COMMENT_LINES = 2;

const CHANGELOG = /\b(used to|previously|formerly|no longer|drifted|the original|we now|now that we)\b/i;

const EXTENSIONS = [".js", ".jsx", ".css"];

const baseRef = process.argv[2] ?? process.env.CHECK_BASE_SHA ?? "origin/main";

const diff = execFileSync("git", ["diff", "--unified=0", `${baseRef}...HEAD`, "--",
	"react/src", "api/src"], { encoding: "utf8", maxBuffer: 1 << 26 });

let file = null;
let newLine = 0;
let run = []; // [{ lineNo, text }] of the current contiguous run of added lines
let failures = 0;

function isSourceFile(path) {
	return EXTENSIONS.some(ext => path.endsWith(ext));
}

// A comment-only run inside the added lines, tracked separately from the raw added-line run:
// block comments span lines with no per-line marker, so "are we still inside /* */" has to be
// carried across lines.
function checkRun() {
	if (!file || !isSourceFile(file) || run.length === 0) return;
	let inBlock = false;
	let commentStart = null;
	let commentLines = [];

	const flushComment = () => {
		if (commentLines.length === 0) return;
		const text = commentLines.join(" ");
		const changelog = text.match(CHANGELOG);
		if (changelog) {
			console.error(`${file}:${commentStart}  reads as changelog: "${changelog[0]}"`);
			failures++;
		} else if (commentLines.length > MAX_NEW_COMMENT_LINES) {
			console.error(`${file}:${commentStart}  ${commentLines.length} new comment lines, limit ${MAX_NEW_COMMENT_LINES}`);
			failures++;
		}
		commentLines = [];
		commentStart = null;
	};

	for (const { lineNo, text } of run) {
		const trimmed = text.trim();
		const isCommentLine = inBlock || trimmed.startsWith("//") || trimmed.startsWith("/*");
		if (isCommentLine) {
			if (commentLines.length === 0) commentStart = lineNo;
			commentLines.push(trimmed);
			if (trimmed.startsWith("/*") && !trimmed.includes("*/")) inBlock = true;
			else if (inBlock && trimmed.includes("*/")) inBlock = false;
		} else {
			flushComment();
		}
	}
	flushComment();
	run = [];
}

for (const raw of diff.split("\n")) {
	if (raw.startsWith("+++ b/")) {
		checkRun();
		file = raw.slice(6);
		continue;
	}
	if (raw.startsWith("@@")) {
		checkRun();
		const m = raw.match(/\+(\d+)/);
		newLine = m ? Number(m[1]) : 0;
		continue;
	}
	if (raw.startsWith("+") && !raw.startsWith("+++")) {
		run.push({ lineNo: newLine, text: raw.slice(1) });
		newLine++;
		continue;
	}
	if (raw.startsWith("-") && !raw.startsWith("---")) continue;
	checkRun();
}
checkRun();

if (failures) {
	console.error(`\n${failures} new comment${failures === 1 ? "" : "s"} to trim — see CLAUDE.md's Comments rule.`);
	process.exit(1);
}
console.log("New comments fine.");
