---
category: Data
---
A bar that shows how much of a limit is used: the fill, the part over the limit, and a marker for where spend should be by today.

## Props

- `value`: the used share, 0 to 100
- `over`: the share past the limit, drawn after the fill in the over colour
- `marker`: where a line stands across the track, 0 to 100 (the pace for today)
- `untargeted`: no limit is set; the track is drawn quiet
- `thin`: the slim track a list row uses
- `negative`: the fill in the negative colour
- `passed`: the limit is already passed; one full fill in the over colour
- `remainder`: the share that is not listed, in the over colour at its width
- `aria-label`: what the gauge measures, e.g. "Decor, August"

## Parts

- `GaugeKey`: the marker drawn inline, so a line of text can say what the marker means. No props.

## Rules

- Takes no `className` or `style`.
- The gauge writes its own widths. Nothing else sets a colour, a size or a radius.
- Put the figures in a `sp-meta` line under the gauge; the gauge itself has no text.

## Example

```jsx
<div className="sp-stack sp-gap-8">
	<Gauge value={91} over={9} marker={68} aria-label="Furniture, August" />
	<span className="sp-row-flex sp-gap-6">
		<GaugeKey />
		<span className="sp-meta sp-meta--over">24.100 of 22.000 kr., 2.100 over</span>
	</span>
</div>
```
