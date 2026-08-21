import { sep } from '../api/format.js'

/** The copy separator as an element, for JSX text: `{a}<Sep />{b}` reads "a • b". One
    component so the character (and any styling it ever grows) changes in one place --
    the string form for template literals is `sep` in api/format.js, which this renders. */
export const Sep = () => sep
