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
