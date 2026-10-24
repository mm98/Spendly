import { useEffect, useState } from 'react'
import { ICONS } from '../../react/src/components/icons.js'

/** A value the story holds for a control it shows: it starts at the arg, and starts again from
    the arg whenever the Controls panel changes it. */
export const useHeld = (args, key) => {
	const [value, setValue] = useState(args[key])
	useEffect(() => { setValue(args[key]) }, [args[key]])
	return [value, setValue]
}

/** An icon picked by name from the app's own register. */
export const iconControl = { control: 'select', options: Object.keys(ICONS) }

/** For a story whose accessibility faults are known and written in later.md: the panel still lists
    them, but the test does not fail on them. Remove it from the story once they are fixed. */
export const knownAccessibilityFaults = { test: 'todo' }
