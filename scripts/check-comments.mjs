// Usage: node scripts/check-comments.mjs [baseRef]
//
// CLAUDE.md's Comments rule, made mechanical, and scoped to the diff rather than the whole
// tree: only comment lines a PR actually adds or changes are checked, so an existing long
// comment nobody touched never fails a run it has nothing to do with -- the same "reports only
// what changed" shape as api/scripts/check-queries.mjs.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const MAX_NEW_COMMENT_LINES = 2;

// The rule's other half: comment what stops someone breaking the code, which is a question of
// how many, not how long. A change whose prose matches or outweighs its code answered it wrong.
const MIN_GROWTH_TO_JUDGE = 5;

const CHANGELOG = /\b(used to|previously|formerly|no longer|drifted|the original|we now|now that we)\b/i;

const EXTENSIONS = [".js", ".jsx", ".css"];

// || rather than ??: an unset workflow input arrives as "", which ?? treats as a value and
// hands to git as a ref, and `git merge-base "" HEAD` is a fatal, not a fallback.
const baseRef = process.argv[2] || process.env.CHECK_BASE_SHA || "origin/main";

// The merge-base, not baseRef...HEAD: a plain "...HEAD" diff is blind to uncommitted work,
// which is most of what this script exists to catch before a commit is ever made. Diffing
// from the merge-base against the working tree sees uncommitted changes locally and is
// identical to the merge-base comparison in CI, where the tree is already fully committed.
const mergeBase = execFileSync("git", ["merge-base", baseRef, "HEAD"], { encoding: "utf8" }).trim();

const diff = execFileSync("git", ["diff", "--unified=0", mergeBase, "--",
	"react/src", "api/src"], { encoding: "utf8", maxBuffer: 1 << 26 });

let file = null;
let newLine = 0;
let run = []; // [{ lineNo, text }] of the current contiguous run of added lines
let hunkCommentsRemoved = 0; // comment lines the hunk deletes, the budget a rewrite may spend
let failures = 0;

// Net growth per file, comments against code: a rewrite that replaces prose with prose nets
// nothing and is judged only on length, below.
const growth = new Map();
let added = { inBlock: false, typed: false };
let removed = { inBlock: false, typed: false };

// byte copies of design/styles and design/react_handoff: their prose is the design's
const DESIGN_COPIES = ["react/src/styles/components.css", "react/src/styles/tokens.css", "react/src/styles/schemes.css", "api/src/styles/schemes.css", "api/src/styles/tokens.css"];
const HANDOFF = /^react\/src\/components\/([^/]+)$/;

function isDesignCopy(path) {
	if (DESIGN_COPIES.includes(path)) return true;
	const name = path.match(HANDOFF)?.[1];
	const twin = name && `design/react_handoff/${name}`;
	return Boolean(twin && existsSync(twin) && existsSync(path) && readFileSync(twin, "utf8") === readFileSync(path, "utf8"));
}

function isSourceFile(path) {
	return EXTENSIONS.some(ext => path.endsWith(ext)) && !isDesignCopy(path);
}

// Whether a line opens, continues or closes a block comment, carried across lines because a
// block comment's inner lines have no marker of their own. A JSDoc tag and the rest of its block
// are a type declaration, not prose: `typed`, and counted as code.
function classify(text, { inBlock, typed }) {
	const trimmed = text.trim();
	if (!trimmed) return { comment: inBlock && !typed, inBlock, typed, blank: true };
	const opens = trimmed.startsWith("/*");
	const comment = inBlock || opens || trimmed.startsWith("//");
	const tagged = (inBlock || opens) && (typed || /^(\/\*\*|\*)?\s*@(param|typedef|type)\b/.test(trimmed));
	let next = inBlock;
	if (opens && !trimmed.includes("*/")) next = true;
	else if (inBlock && trimmed.includes("*/")) next = false;
	return { comment: comment && !tagged, inBlock: next, typed: next && tagged, blank: false };
}

function tally(side, comment) {
	if (!file || !isSourceFile(file)) return;
	const e = growth.get(file) ?? { comment: 0, code: 0 };
	const delta = side === "+" ? 1 : -1;
	if (comment) e.comment += delta;
	else e.code += delta;
	growth.set(file, e);
}

// A comment-only run inside the added lines, tracked separately from the raw added-line run.
// A rewrite may spend what it removed: replacing a six-line comment with five is a shortening,
// while replacing it with nine is the growth this cap exists to stop.
function checkRun(removedBudget) {
	// a skipped file's lines are dropped here, or the next file would be judged on them
	if (!file || !isSourceFile(file) || run.length === 0) { run = []; return; }
	const limit = Math.max(MAX_NEW_COMMENT_LINES, removedBudget);
	let state = { inBlock: false, typed: false };
	let commentStart = null;
	let commentLines = [];

	const flushComment = () => {
		if (commentLines.length === 0) return;
		const text = commentLines.join(" ");
		const changelog = text.match(CHANGELOG);
		if (changelog) {
			console.error(`${file}:${commentStart}  reads as changelog: "${changelog[0]}"`);
			failures++;
		} else if (commentLines.length > limit) {
			console.error(`${file}:${commentStart}  ${commentLines.length} new comment lines, limit ${limit}`);
			failures++;
		}
		commentLines = [];
		commentStart = null;
	};

	for (const { lineNo, text } of run) {
		const trimmed = text.trim();
		const { comment, ...next } = classify(text, state);
		state = next;
		if (comment && trimmed) {
			if (commentLines.length === 0) commentStart = lineNo;
			commentLines.push(trimmed);
		} else if (trimmed) {
			flushComment();
		}
	}
	flushComment();
	run = [];
}

for (const raw of diff.split("\n")) {
	if (raw.startsWith("+++ b/")) {
		checkRun(hunkCommentsRemoved);
		file = raw.slice(6);
		added = { inBlock: false, typed: false };
		removed = { inBlock: false, typed: false };
		continue;
	}
	if (raw.startsWith("@@")) {
		checkRun(hunkCommentsRemoved);
		const m = raw.match(/\+(\d+)/);
		newLine = m ? Number(m[1]) : 0;
		hunkCommentsRemoved = 0;
		added = { inBlock: false, typed: false };
		removed = { inBlock: false, typed: false };
		continue;
	}
	if (raw.startsWith("+") && !raw.startsWith("+++")) {
		const { comment, blank, ...next } = classify(raw.slice(1), added);
		added = next;
		if (!blank) tally("+", comment);
		run.push({ lineNo: newLine, text: raw.slice(1) });
		newLine++;
		continue;
	}
	if (raw.startsWith("-") && !raw.startsWith("---")) {
		const { comment, blank, ...next } = classify(raw.slice(1), removed);
		removed = next;
		if (!blank) tally("-", comment);
		if (comment && !blank) hunkCommentsRemoved++;
		continue;
	}
	checkRun(hunkCommentsRemoved);
}
checkRun(hunkCommentsRemoved);

for (const [path, { comment, code }] of growth) {
	if (comment >= MIN_GROWTH_TO_JUDGE && comment >= code) {
		console.error(`${path}  adds ${comment} comment lines against ${code} of code — prose matching or outweighing code`);
		failures++;
	}
}

if (failures) {
	console.error(`\n${failures} new comment${failures === 1 ? "" : "s"} to trim — see CLAUDE.md's Comments rule.`);
	process.exit(1);
}
console.log("New comments fine.");
