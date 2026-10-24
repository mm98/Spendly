
export const join = (...parts) => parts.filter(Boolean).join(' ')

export const pick = (set, value, name, component) => {
	if (value in set) return set[value]
	console.error(`<${component}> ${name}="${value}" is not one of: ${Object.keys(set).join(' | ')}`)
	return null
}

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
