// Usage: node scripts/check-external-links.mjs
//
// Every control that opens a new browsing context has to carry rel="noopener". Unlike the
// comments check this reads the whole tree rather than the diff: a link that opens a new tab
// without it is wrong on the day it is written and every day after, and a guard that only
// looks at what a PR touched would let the first one through forever once it landed.
//
// What the opened page can do without it: window.opener points back at the tab it came from,
// and a shop that redirects it lands the reader on a page of its choosing wearing this app's
// address. Browsers imply noopener for target="_blank" now; the attribute is the guarantee
// rather than the default, and it is also what covers a target set any other way.
//
// Referrer is a separate question and not this check's: Referrer-Policy: no-referrer goes out
// on every response from api/src/app.js, so no rel attribute has to carry noreferrer.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["react/src"];
const EXTENSIONS = [".js", ".jsx"];

/** Every source file under the roots, so a new folder is covered without editing this list. */
function sourceFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) sourceFiles(full, out);
		else if (EXTENSIONS.includes(path.extname(entry))) out.push(full);
	}
	return out;
}

/* The tag an attribute sits in. Scanning back to the nearest '<' and forward to the '>' that
   closes it is enough here and stays honest about nesting: a '>' inside a {} expression or a
   quoted string does not end the tag, so both are stepped over rather than counted. */
function enclosingTag(text, at) {
	let start = text.lastIndexOf("<", at);
	if (start < 0) return null;
	let depth = 0;
	let quote = null;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (quote) { if (ch === quote) quote = null; continue; }
		if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
		if (ch === "{") depth++;
		else if (ch === "}") depth--;
		else if (ch === ">" && depth === 0) return text.slice(start, i + 1);
	}
	return null;
}

const lineOf = (text, at) => text.slice(0, at).split("\n").length;

const findings = [];

for (const root of ROOTS) {
	for (const file of sourceFiles(root)) {
		const text = readFileSync(file, "utf8");

		/* A new tab, however the target is written: target="_blank" and target={'_blank'} both
		   open one, and both need the attribute. */
		for (const m of text.matchAll(/target\s*=\s*(?:"_blank"|'_blank'|\{\s*['"`]_blank['"`]\s*\})/g)) {
			const tag = enclosingTag(text, m.index);
			if (tag && /\brel\s*=\s*(?:["'][^"']*\bnoopener\b|\{[^}]*\bnoopener\b)/.test(tag)) continue;
			findings.push(`${file}:${lineOf(text, m.index)}  opens a new tab without rel="noopener"`);
		}

		/* The other door to a new context. A third argument asks some browsers for a popup
		   window, so the link back is cut on the tab it returns: `tab.opener = null`. */
		for (const m of text.matchAll(/\bwindow\.open\s*\(/g)) {
			const tail = text.slice(m.index, m.index + 400);
			const call = tail.slice(0, tail.indexOf(")") + 1 || 400);
			if (/,[^,]*,/.test(call)) {
				findings.push(`${file}:${lineOf(text, m.index)}  window.open with a third argument opens a popup window`);
				continue;
			}
			if (/\.opener\s*=\s*null/.test(tail)) continue;
			findings.push(`${file}:${lineOf(text, m.index)}  window.open without cutting tab.opener`);
		}
	}
}

for (const line of findings) console.error(line);
if (findings.length) {
	console.error(`\n${findings.length} link(s) open a new tab without cutting the link back, or as a popup window.`);
	process.exit(1);
}
console.log("Every link that opens a new tab carries rel=\"noopener\".");
