/* What the playground knows about the library.

   One entry per export, read off the component signatures and the variant maps in
   `react_handoff/` rather than typed from memory - so a prop renamed there shows up
   here as a control with no effect rather than as a control that quietly lies.

   Prop tuple: [name, kind, default, options]
     enum  a closed set - the keys of that component's variant map
     bool  a flag
     text  a string
     num   a number
     icon  a name the register knows, drawn by the component itself
     node  a slot: drop a component into it
     fn    a handler - no control, printed as {fn}
     json  structured data with no sensible control: edited as JSON

   `kids` says what the component's children are: 'text' an editable string, 'nodes'
   a drop target, 'both' either, null none. `needs` names the parent a part belongs
   inside - it still renders alone, but it is not what the library does with it. */

export const ICONS = ['alert-circle', 'alert-triangle', 'archive', 'armchair', 'arrows-join', 'bookmark',
	'browser', 'building-store', 'bulb', 'calendar', 'camera', 'category', 'chart-bar', 'check',
	'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'clock', 'copy', 'device-desktop',
	'diamond', 'dots-vertical', 'download', 'external-link', 'eye', 'file', 'file-text', 'filter',
	'flower', 'grip-vertical', 'heart', 'home', 'info-circle', 'keyboard', 'lamp', 'layout-grid',
	'lock', 'mail', 'minus', 'moon', 'paperclip', 'pencil', 'photo', 'plus', 'power', 'receipt',
	'refresh', 'search', 'settings', 'shopping-bag', 'star', 'sun', 'tag', 'trash', 'upload',
	'user', 'wifi', 'x'];

export const SWATCHES = ['green-1', 'green-2', 'green-3', 'amber-1', 'amber-2', 'red-1', 'red-2', 'blue-1', 'grey-1'];

const C = (n, f, g, kids, sample, p, needs) => ({ n, f, g, kids, sample, p: p || [], needs });

export const COMPONENTS = [
	/* ---- controls ---- */
	C('Button', 'Button.jsx', 'Controls', 'text', 'Save order', [
		['variant', 'enum', 'solid', ['solid', 'outline', 'text']],
		['color', 'enum', 'primary', ['primary', 'warning', 'danger']],
		['size', 'enum', 'standard', ['standard', 'small']],
		['border', 'enum', 'line', ['line', 'inherit']],
		['fullWidth', 'bool', false],
		['iconStart', 'icon', ''],
		['iconEnd', 'icon', ''],
		['to', 'text', ''],
		['href', 'text', '']
	]),
	C('IconButton', 'Button.jsx', 'Controls', null, null, [
		['icon', 'icon', 'dots-vertical'],
		['label', 'text', 'More'],
		['variant', 'enum', 'bare', ['bare', 'outline', 'quiet']],
		['size', 'enum', 'row', ['row', 'small', 'field']],
		['to', 'text', ''],
		['href', 'text', '']
	]),
	C('Chip', 'Chip.jsx', 'Controls', 'text', 'Indbo Møbler', [
		['variant', 'enum', 'outline', ['outline', 'solid', 'dashed', 'pill', 'facet']],
		['color', 'enum', 'default', ['default', 'danger']],
		['trail', 'node', null],
		['inputType', 'enum', 'checkbox', ['checkbox', 'radio']],
		['name', 'text', ''],
		['value', 'text', ''],
		['selected', 'bool', false],
		['onClick', 'fn', null]
	]),
	C('Pill', 'Pill.jsx', 'Controls', 'text', 'Ordered', [
		['color', 'enum', 'default', ['default', 'warning', 'danger', 'success']],
		['state', 'enum', '', ['', 'progress']]
	]),
	C('Kbd', 'Utilities.jsx', 'Controls', 'text', '⌘K', [['accent', 'bool', false]]),

	/* ---- choice ---- */
	C('Check', 'Choice.jsx', 'Choice', null, null, [
		['checked', 'bool', false], ['indeterminate', 'bool', false], ['disabled', 'bool', false]
	]),
	C('Radio', 'Choice.jsx', 'Choice', null, null, [
		['checked', 'bool', false], ['name', 'text', 'group'], ['disabled', 'bool', false]
	]),
	C('Switch', 'Choice.jsx', 'Choice', null, null, [
		['checked', 'bool', false], ['disabled', 'bool', false]
	]),
	C('Choice', 'Choice.jsx', 'Choice', 'text', 'Send a copy to the vendor', [
		['variant', 'enum', 'default', ['default', 'row', 'described']],
		['control', 'node', null],
		['description', 'text', '']
	]),
	C('FieldGroup', 'Choice.jsx', 'Choice', 'nodes', null, [['legend', 'text', 'What to send']]),
	C('Picker', 'Choice.jsx', 'Choice', null, null, [
		['swatches', 'json', '["green-1","green-2","green-3","amber-1","amber-2","red-1"]'],
		['icons', 'json', ''],
		['value', 'text', 'green-2'],
		['custom', 'bool', false],
		['customIcon', 'node', null],
		['onChange', 'fn', null]
	]),
	C('Segmented', 'Segmented.jsx', 'Choice', null, null, [
		['name', 'text', 'period'],
		['options', 'json', '[{"value":"month","label":"Month"},{"value":"quarter","label":"Quarter"},{"value":"year","label":"Year"}]'],
		['value', 'text', 'month'],
		['variant', 'enum', 'default', ['default', 'facet']],
		['onChange', 'fn', null]
	]),
	C('Stepper', 'Stepper.jsx', 'Choice', null, null, [
		['value', 'num', 4], ['min', 'num', 1], ['max', 'num', 99], ['step', 'num', 1],
		['locale', 'text', 'da-DK'], ['onChange', 'fn', null]
	]),

	/* ---- fields ---- */
	C('Field', 'Field.jsx', 'Fields', 'nodes', null, [
		['label', 'text', 'Vendor'],
		['id', 'text', 'pg-field'],
		['lead', 'node', null], ['trail', 'node', null], ['chevron', 'node', null], ['kbd', 'node', null],
		['unit', 'text', ''],
		['message', 'text', ''],
		['messageType', 'enum', 'hint', ['hint', 'warning', 'danger']],
		['required', 'bool', false]
	]),
	C('TextField', 'Inputs.jsx', 'Fields', null, null, [
		['value', 'text', 'Indbo Møbler'],
		['type', 'enum', 'text', ['text', 'email', 'tel', 'url']],
		['multiline', 'bool', false], ['rows', 'num', 3],
		['variant', 'enum', 'default', ['default', 'empty', 'readonly', 'stretch']],
		['placeholder', 'text', ''], ['error', 'bool', false], ['disabled', 'bool', false],
		['onChange', 'fn', null]
	]),
	C('PasswordField', 'Inputs.jsx', 'Fields', null, null, [
		['value', 'text', 'correct horse'], ['placeholder', 'text', ''], ['error', 'bool', false], ['onChange', 'fn', null]
	]),
	C('NumberField', 'Inputs.jsx', 'Fields', null, null, [
		['value', 'num', 1320], ['decimals', 'num', 2], ['min', 'num', 0],
		['locale', 'text', 'da-DK'], ['computed', 'bool', false], ['error', 'bool', false], ['onChange', 'fn', null]
	]),
	C('SearchInput', 'Inputs.jsx', 'Fields', null, null, [
		['value', 'text', ''], ['placeholder', 'text', 'Search orders'], ['kbd', 'node', null], ['onChange', 'fn', null]
	]),
	/* Two bounds, so `value` is a pair and not a number - seeded as one, which drew
	   nothing at all until the playground was pointed at it. */
	C('RangeSlider', 'Inputs.jsx', 'Fields', null, null, [
		['value', 'json', '[200, 4800]'],
		['min', 'num', 0], ['max', 'num', 6000], ['step', 'num', 100],
		['label', 'text', 'Amount'], ['onChange', 'fn', null]
	]),
	C('TokensField', 'Inputs.jsx', 'Fields', null, null, [
		['value', 'json', '["Chairs","Tables","Lamps"]'],
		['placeholder', 'text', 'Add a category'], ['danger', 'bool', false], ['onChange', 'fn', null]
	]),
	C('FileDrop', 'FileDrop.jsx', 'Fields', 'text', 'Drop a receipt, or browse', [
		['icon', 'icon', 'upload'], ['accept', 'text', 'image/*,application/pdf'], ['multiple', 'bool', false], ['onFiles', 'fn', null]
	]),

	/* ---- dates ---- */
	C('DateField', 'DatePickers.jsx', 'Dates', null, null, [
		['value', 'text', '2026-09-18'], ['min', 'text', ''], ['max', 'text', ''],
		['native', 'bool', false], ['danger', 'bool', false], ['showWeeks', 'bool', true],
		['locale', 'text', 'da-DK'], ['id', 'text', 'pg-date'], ['onChange', 'fn', null]
	]),
	C('RangePicker', 'DatePickers.jsx', 'Dates', null, null, [
		['from', 'text', '2026-09-01'], ['to', 'text', '2026-09-18'],
		['min', 'text', ''], ['max', 'text', ''], ['minDays', 'num', 0],
		['showWeeks', 'bool', true], ['locale', 'text', 'da-DK'],
		['onChange', 'fn', null], ['onApply', 'fn', null], ['onCancel', 'fn', null]
	]),
	/* Its children may only be a `Selected`, which is the one export the drawer
	   leaves out, so there is nothing legal to nest here - hence no children. The
	   presets are seeded with the library's own five, both so it renders and so the
	   shape is visible: they replace the standard set, they do not remove it. */
	C('PeriodPicker', 'DatePickers.jsx', 'Dates', null, null, [
		['presets', 'json', '[{"value":"week","label":"This week"},{"value":"month","label":"This month"},{"value":"quarter","label":"This quarter"},{"value":"year","label":"This year"},{"value":"custom","label":"Custom"}]'],
		['value', 'enum', 'month', ['week', 'month', 'quarter', 'year', 'custom']],
		['from', 'text', ''], ['to', 'text', ''],
		['name', 'text', 'period'], ['custom', 'node', null], ['locale', 'text', 'da-DK'], ['onChange', 'fn', null]
	]),
	C('Calendar', 'DatePickers.jsx', 'Dates', 'nodes', null, [
		['sheet', 'bool', false], ['open', 'bool', true]
	]),

	/* ---- choosing ---- */
	C('Combobox', 'Combobox.jsx', 'Choosing', 'nodes', null, [
		['variant', 'enum', 'default', ['default', 'sort', 'end', 'stretch']],
		['value', 'text', 'Indbo Møbler'],
		['lead', 'node', null],
		['open', 'bool', false], ['defaultOpen', 'bool', false],
		['searchable', 'bool', false], ['search', 'text', ''], ['placeholder', 'text', 'Pick a vendor'],
		['onOpenChange', 'fn', null], ['onSearch', 'fn', null]
	]),
	C('ComboboxOption', 'Combobox.jsx', 'Choosing', 'text', 'Indbo Møbler', [
		['selected', 'bool', false], ['active', 'bool', false],
		['dot', 'enum', '', ['', 'progress', 'warning', 'danger', 'success']],
		['mark', 'node', null], ['meta', 'text', ''], ['onSelect', 'fn', null]
	], 'Combobox'),
	C('ComboboxGroup', 'Combobox.jsx', 'Choosing', 'nodes', null, [], 'Combobox'),
	C('ComboboxEmpty', 'Combobox.jsx', 'Choosing', 'text', 'No vendor by that name', [], 'Combobox'),

	/* ---- surfaces ---- */
	C('Card', 'Card.jsx', 'Surfaces', 'nodes', null, [
		['variant', 'enum', 'default', ['default', 'flush', 'row', 'shell']],
		['color', 'enum', 'default', ['default', 'warning', 'danger']],
		['to', 'text', ''],
		['footer', 'node', null],
		['footerLayout', 'enum', 'fill', ['fill', 'split', 'stack']],
		['footerCommits', 'bool', false],
		['chevron', 'node', null]
	]),
	C('Cards', 'Card.jsx', 'Surfaces', 'nodes', null, [['fluid', 'bool', false]]),
	C('CardBody', 'Card.jsx', 'Surfaces', 'nodes', null, [], 'Card'),
	C('Toolbar', 'Card.jsx', 'Surfaces', 'nodes', null, [
		['variant', 'enum', 'default', ['default', 'loose', 'link', 'toggle']],
		['expanded', 'bool', false], ['onClick', 'fn', null]
	]),
	C('ListFooter', 'Card.jsx', 'Surfaces', 'nodes', null, [['loose', 'bool', false]]),
	C('Well', 'Well.jsx', 'Surfaces', 'text', 'Nothing was imported from this file.', [
		['variant', 'enum', 'default', ['default', 'quiet']],
		['color', 'enum', 'default', ['default', 'warning', 'danger']]
	]),
	C('LineEditor', 'LineEditor.jsx', 'Surfaces', 'nodes', null, [
		['title', 'text', 'Row 2 of 4 in Housing'],
		['what', 'text', 'row'],
		['commit', 'text', 'Save row'],
		['hint', 'text', 'Enter saves · Escape cancels'],
		['photo', 'node', null],
		['first', 'bool', false], ['last', 'bool', false], ['handle', 'bool', false], ['saving', 'bool', false],
		['onMoveUp', 'fn', null], ['onMoveDown', 'fn', null], ['onDelete', 'fn', null],
		['onCommit', 'fn', null], ['onCancel', 'fn', null]
	]),
	C('Empty', 'Utilities.jsx', 'Surfaces', 'nodes', null, [['dashed', 'bool', false]]),
	C('EmptyTitle', 'Utilities.jsx', 'Surfaces', 'text', 'No orders yet', [], 'Empty'),
	C('EmptyBody', 'Utilities.jsx', 'Surfaces', 'text', 'The first order you create shows up here.', [], 'Empty'),
	C('Stacked', 'Utilities.jsx', 'Surfaces', 'nodes', null, []),
	C('Line', 'Utilities.jsx', 'Surfaces', 'nodes', null, []),

	/* ---- identity ---- */
	C('Mark', 'Mark.jsx', 'Identity', 'text', 'HAY', [
		['size', 'enum', 'medium', ['small', 'medium', 'large', 'xlarge']],
		['fill', 'enum', 'default', ['default', 'solid', 'plain', 'photo', 'empty', 'none', 'add']],
		['swatch', 'enum', '', ['', 'green-1', 'green-2', 'green-3', 'amber-1', 'amber-2', 'red-1', 'red-2', 'blue-1']],
		['round', 'bool', false],
		['count', 'num', null],
		['text', 'node', null],
		['danger', 'bool', false],
		['remove', 'node', null],
		['as', 'enum', '', ['', 'label']],
		['onClick', 'fn', null]
	]),
	C('MarkRemove', 'Mark.jsx', 'Identity', null, null, [['onClick', 'fn', null]], 'Mark'),

	/* ---- lists ---- */
	C('List', 'List.jsx', 'Lists', 'nodes', null, [
		['data', 'json', '[{"id":"1","name":"Indbo Møbler","amount":"3.980,00 kr."},{"id":"2","name":"HAY","amount":"12.400,00 kr."}]'],
		['recordKey', 'text', 'id'], ['noun', 'text', 'orders'],
		['pageSize', 'num', 20], ['selectionKey', 'text', ''], ['compact', 'bool', false],
		['onRowClick', 'fn', null]
	]),
	C('ListCell', 'List.jsx', 'Lists', 'nodes', null, [
		['width', 'enum', '', ['', 'title', 'flex', 'date', 'number', 'status', 'amount', 'menu']],
		['cell', 'enum', 'default', ['default', 'flex', 'amount', 'menu']],
		['truncate', 'bool', false], ['head', 'bool', false]
	], 'List'),
	C('Caption', 'List.jsx', 'Lists', 'nodes', null, [], 'List'),
	C('ListHead', 'List.jsx', 'Lists', 'nodes', null, [], 'List'),
	C('ListRow', 'List.jsx', 'Lists', 'nodes', null, [], 'List'),
	C('Foot', 'List.jsx', 'Lists', 'nodes', null, [], 'List'),
	C('ListItem', 'ListItem.jsx', 'Lists', 'nodes', null, [
		['variant', 'enum', 'default', ['default', 'outline', 'primary', 'stack', 'top', 'add', 'carried', 'card']],
		['color', 'enum', 'default', ['default', 'warning', 'danger', 'success']],
		['mark', 'node', null], ['handle', 'node', null], ['actions', 'node', null],
		['count', 'num', null], ['chevron', 'node', null],
		['selected', 'bool', false], ['to', 'text', ''], ['onClick', 'fn', null]
	]),
	C('Insertion', 'ListItem.jsx', 'Lists', 'nodes', null, [], 'ListItem'),
	C('ListItemRemove', 'ListItem.jsx', 'Lists', 'text', 'Remove', [], 'ListItem'),

	/* ---- overlays ---- */
	C('Menu', 'Overlays.jsx', 'Overlays', 'nodes', null, [
		['position', 'enum', '', ['', 'floating', 'sub', 'row', 'plain', 'up', 'start', 'side-left', 'side-right']],
		['scrolls', 'bool', false]
	]),
	C('MenuItem', 'Overlays.jsx', 'Overlays', 'text', 'Edit', [
		['icon', 'icon', 'pencil'],
		['disabled', 'bool', false], ['danger', 'bool', false],
		['dot', 'enum', '', ['', 'progress', 'warning', 'danger', 'success']],
		['selected', 'bool', false], ['onClick', 'fn', null]
	], 'Menu'),
	C('MenuLabel', 'Overlays.jsx', 'Overlays', 'text', 'This order', [], 'Menu'),
	C('MenuSeparator', 'Overlays.jsx', 'Overlays', null, null, [], 'Menu'),
	C('Popover', 'Overlays.jsx', 'Overlays', 'nodes', null, [
		['position', 'enum', 'default', ['default', 'start', 'end', 'static']],
		['head', 'text', 'Filter by amount'],
		['summary', 'text', '18 of 240 orders'],
		['note', 'text', ''],
		['actions', 'node', null]
	]),
	C('Anchor', 'Overlays.jsx', 'Overlays', 'nodes', null, [['open', 'bool', true]]),
	C('Dialog', 'Overlays.jsx', 'Overlays', 'nodes', null, [['scrim', 'bool', false]]),
	C('DialogTitle', 'Overlays.jsx', 'Overlays', 'text', 'Delete this order?', [], 'Dialog'),
	C('DialogBody', 'Overlays.jsx', 'Overlays', 'text', 'SPENDLY-447 from Indbo Møbler, 3.980,00 kr. Its 4 lines go with it.', [], 'Dialog'),
	C('DialogActions', 'Overlays.jsx', 'Overlays', 'nodes', null, [], 'Dialog'),
	C('Toast', 'Overlays.jsx', 'Overlays', 'both', 'Line removed from SPENDLY-447', [
		['icon', 'icon', 'check'],
		['color', 'enum', 'default', ['default', 'danger']],
		['compact', 'bool', false], ['asks', 'bool', false]
	]),
	C('ToastUndo', 'Overlays.jsx', 'Overlays', 'text', 'Undo', [['onClick', 'fn', null]], 'Toast'),
	C('Alert', 'Overlays.jsx', 'Overlays', 'text', 'Two orders share the same invoice number.', [
		['color', 'enum', 'warning', ['warning', 'danger', 'success']],
		['mark', 'node', null],
		['title', 'text', 'Possible duplicate']
	]),
	C('Scrim', 'Shell.jsx', 'Overlays', 'nodes', null, [['dialog', 'bool', false]]),

	/* ---- data ---- */
	C('Gauge', 'Data.jsx', 'Data', null, null, [
		['value', 'num', 68], ['over', 'num', null], ['marker', 'num', null],
		['untargeted', 'bool', false], ['thin', 'bool', false], ['negative', 'bool', false]
	]),
	C('GaugeKey', 'Data.jsx', 'Data', 'nodes', null, []),
	C('Bars', 'Data.jsx', 'Data', null, null, [
		['variant', 'enum', 'default', ['default', 'plot', 'spark']],
		['columns', 'json', '[{"key":"jul","height":51,"tick":"Jul","from":"2026-07-01","to":"2026-07-31"},{"key":"aug","height":81,"tick":"Aug","from":"2026-08-01","to":"2026-08-31"},{"key":"sep","height":33,"tick":"Sep","from":"2026-09-01","to":"2026-09-30"}]'],
		['selected', 'text', ''],
		['onSelect', 'fn', null]
	]),
	C('Plot', 'Data.jsx', 'Data', 'nodes', null, [
		['axis', 'json', '["80.000","60.000","40.000","20.000","0"]'],
		['gridlines', 'num', 4],
		['limit', 'json', '{"at":34,"label":"Monthly limit 68.000 kr."}']
	]),
	C('Stat', 'Data.jsx', 'Data', 'nodes', null, [
		['figure', 'text', '48.320,00 kr.'], ['large', 'bool', false],
		['label', 'text', 'Spent in August'], ['delta', 'text', 'Saved 12.400,00 kr.']
	]),
	C('Sum', 'Data.jsx', 'Data', 'text', 'Total', [
		['variant', 'enum', 'default', ['default', 'stacked', 'total']],
		['value', 'text', '48.320,00 kr.']
	]),
	C('Skeleton', 'Utilities.jsx', 'Data', null, null, [
		['shape', 'enum', 'line', ['line', 'short', 'end', 'title', 'pill', 'bar', 'mark', 'mark-large', 'check', 'icon']]
	]),
	C('Spinner', 'Utilities.jsx', 'Data', null, null, []),

	/* ---- shell ---- */
	C('Shell', 'Shell.jsx', 'Shell', 'nodes', null, [['collapsed', 'bool', false]]),
	C('TopBar', 'Shell.jsx', 'Shell', 'nodes', null, [['touch', 'bool', false]]),
	C('ShellContent', 'Shell.jsx', 'Shell', 'nodes', null, [
		['layout', 'enum', 'default', ['default', 'split', 'rail']]
	], 'Shell'),
	C('Sidebar', 'Shell.jsx', 'Shell', 'nodes', null, [
		['variant', 'enum', 'default', ['default', 'rail', 'peek', 'slide-in', 'slide-out']]
	], 'Shell'),
	C('SidebarBrand', 'Shell.jsx', 'Shell', 'text', 'Spendly', [], 'Sidebar'),
	C('SidebarGroup', 'Shell.jsx', 'Shell', 'nodes', null, [], 'Sidebar'),
	C('SidebarDivider', 'Shell.jsx', 'Shell', null, null, [], 'Sidebar'),
	C('SidebarGrip', 'Shell.jsx', 'Shell', null, null, [['expanded', 'bool', true], ['onClick', 'fn', null]], 'Sidebar'),
	C('NavItem', 'Shell.jsx', 'Shell', 'text', 'Orders', [
		['variant', 'enum', 'default', ['default', 'action', 'light', 'edited']],
		['icon', 'icon', 'receipt'],
		['count', 'num', null],
		['countColor', 'enum', '', ['', 'warning', 'danger', 'success']],
		['sub', 'text', ''], ['current', 'bool', false], ['to', 'text', ''], ['onClick', 'fn', null]
	], 'Sidebar'),

	/* ---- touch ---- */
	/* The phone's top bar is TopBar with `touch` - one bar for both surfaces. */
	C('TabBar', 'Touch.jsx', 'Touch', 'nodes', null, []),
	C('TabBarItem', 'Touch.jsx', 'Touch', 'text', 'Orders', [
		['icon', 'icon', 'receipt'], ['current', 'bool', false], ['onClick', 'fn', null]
	], 'TabBar'),
	C('Sheet', 'Touch.jsx', 'Touch', 'nodes', null, [['handle', 'bool', true]]),
	C('SaveBar', 'Touch.jsx', 'Touch', 'nodes', null, [])
];

export const GROUPS = ['Controls', 'Choice', 'Fields', 'Dates', 'Choosing', 'Surfaces', 'Identity', 'Lists', 'Overlays', 'Data', 'Shell', 'Touch'];

export const BY_NAME = Object.fromEntries(COMPONENTS.map(c => [c.n, c]));

/** The props a fresh drop starts with: every prop that has a default worth showing. */
export function seed(name) {
	const c = BY_NAME[name];
	if (!c) return {};
	const out = {};
	for (const [prop, kind, def] of c.p) {
		if (def === null || def === '' || def === false) continue;
		if (kind === 'fn' || kind === 'node') continue;
		out[prop] = def;
	}
	return out;
}
