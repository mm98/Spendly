/* Before the first paint, so a dark reader never sees a light frame. A file rather than inline
   code: the server's policy runs no inline script. The key and the rule are app/theme.js's. */
(function () {
	var chosen = null
	try { chosen = localStorage.getItem('spendly:theme') } catch (e) { /* storage denied */ }
	document.documentElement.dataset.theme = chosen || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
})()
