/* Before the first paint, so a dark reader never sees a light frame. A file rather than inline
   code: the server's policy runs no inline script. The key and the rule are app/theme.js's. */
(function () {
	var chosen = null
	try { chosen = localStorage.getItem('spendly:theme') } catch (e) { /* storage denied */ }
	var theme = chosen || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
	document.documentElement.dataset.theme = theme
	// the browser's bar takes the dark --surface (tokens.css) until app/theme.js reads the token itself
	var bar = document.querySelector('meta[name="theme-color"]')
	if (bar && theme === 'dark') bar.content = '#221f1b'
})()
