/* The three helpers every component in this library uses, so the rules are stated
   once rather than copied thirty times.

   A variant is a named prop with a closed set of values. The sets are the
   `--*` rules in styles/components.css, read out of the stylesheet rather than
   typed from memory, and the component maps a value to exactly one class. Nothing
   here styles anything: values live in tokens.css, rules in components.css. */

export const join = (...parts) => parts.filter(Boolean).join(' ')

/** Maps a prop value to its class. An unknown value is reported rather than
    ignored: a merged class string would render a class with no rule behind it and
    a control that looks a weight it is not, silently. */
export const pick = (set, value, name, component) => {
	if (value in set) return set[value]
	console.error(`<${component}> ${name}="${value}" is not one of: ${Object.keys(set).join(' | ')}`)
	return null
}

/** Strips the styling escape hatches. A look the props cannot express is a gap in
    the design system: it gets drawn in Components.dc.html, given a rule in
    components.css and a value in the component's own set - never patched at the
    call site, where it is invisible to the design system and to styles/check.js. */
/* What a component refuses: a look passed in from outside. There is no list of
   retired prop names here - this library has no consumers to keep compatible, so a
   rename is finished when the name is gone. */
export const reject = (rest, component) => {
	for (const escape of ['className', 'style'])
		if (escape in rest) {
			console.error(
				`<${component}> takes no ${escape}. A look the props cannot express is a missing ` +
				'variant: draw it in the library, give it a rule in components.css, and add it here.'
			)
			delete rest[escape]
		}
	return rest
}
