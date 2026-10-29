/* Before the first paint, so a reader never sees a frame in the wrong theme or colour scheme. A file rather than inline
   code: the server's policy runs no inline script. The keys and the rule are app/theme.js's. */
(function () {
	var chosen = null
	try { chosen = localStorage.getItem('spendly:theme') } catch (e) { /* storage denied */ }
	var theme = chosen || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
	document.documentElement.dataset.theme = theme
	var scheme = null
	try { scheme = localStorage.getItem('spendly:scheme') } catch (e) { /* storage denied */ }
	// a removed scheme reads as the default
	document.documentElement.dataset.scheme = !scheme || scheme === 'green' ? 'emerald' : scheme
	// the browser's bar takes the dark --surface (tokens.css) until app/theme.js reads the token itself
	var bar = document.querySelector('meta[name="theme-color"]')
	if (bar && theme === 'dark') bar.content = '#191d1b'
})()
