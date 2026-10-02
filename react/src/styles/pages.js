// each screen's layout file; imported after components.css, since both share @layer base and
// the later rule wins a tie there
import.meta.glob('./pages/*.css', { eager: true })
