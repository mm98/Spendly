import { useEffect, useRef, useState } from 'react'
import { ImageOrIcon } from './Icon.jsx'
import { HiddenFileInput } from './FileInput.jsx'
import { PHOTO_FILES } from './fileKinds.js'

/* One frame for the two cards that draw one. `photo` is `{ present, src }`: only the host
   knows whether its record has been saved yet. The first image only -- the frame holds one. */
const firstImage = list => [...(list ?? [])].find(f => f.type.startsWith('image/'))

/** Pasting is a window listener, not one of `dropProps`: a paste goes to whatever holds focus,
    so a handler on an element that cannot hold it never runs. The frame promises it plainly. */
export function useDroppedPhoto(onPick) {
	const [over, setOver] = useState(false)
	// The handler is bound once; the callback it should use is whatever the latest render
	// passed, which a ref carries without rebinding the listener on every keystroke.
	const pick = useRef(onPick)
	pick.current = onPick

	const take = list => {
		const image = firstImage(list)
		if (image) pick.current(image)
	}

	useEffect(() => {
		const onPaste = e => {
			const image = firstImage(e.clipboardData?.files)
			if (image) pick.current(image)
		}
		window.addEventListener('paste', onPaste)
		return () => window.removeEventListener('paste', onPaste)
	}, [])

	return {
		take,
		over,
		dropProps: {
			onDragOver: e => { e.preventDefault(); setOver(true) },
			onDragLeave: () => setOver(false),
			onDrop: e => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files) }
		}
	}
}

/** `heading` and `name` are drawn only on a phone; a host with a headline of its own passes
    neither. */
export function LinePhoto({ photo, heading, name, label, onPick, onClear }) {
	const file = useRef(null)

	return (
		<div className="line-photo">
			<button type="button" className="line-photo-frame"
				onClick={() => file.current?.click()}
				aria-label={photo.present ? 'Replace the photo' : 'Add a photo'}>
				{/* An image that will not load falls back to the same mark an empty frame draws,
				    rather than to the browser's broken-picture glyph -- a stored thumbnail that
				    has gone, or a picture the reader's connection could not fetch, should read as
				    "no picture", which is what it is. `ImageOrIcon` is that fallback. */}
				{photo.src
					? <ImageOrIcon src={photo.src} icon="photo" imgClassName="line-photo-img"
						className="line-photo-mark-icon" />
					: <span className="line-photo-mark">
						<ImageOrIcon icon="photo" />{photo.present ? null : 'Add photo'}</span>}
			</button>
			<HiddenFileInput ref={file} kind={PHOTO_FILES} label={label}
				onFiles={list => { const image = firstImage(list); if (image) onPick(image) }} />
			{/* Two plain text actions with a hairline between them, spread to the frame's own
			    width. They were `ButtonLink`s, which is this app's *caps* text action — SEE ALL,
			    CLEAR ALL, SHOW ALL, and every other one of them is caps — so sentence-case words
			    came out bold, letter-spaced and underlined. These are their own thing: 12px,
			    medium, no underline until hovered.

			    The line under them names two gestures a phone does not have, so the phone does
			    not print it — there the frame is tapped, which needs no sentence.

			    On a phone the card's head is not drawn at all — the design puts what it says
			    beside the frame instead, with the record's own name under it, and that is the
			    whole header. Both are hidden on a desktop, where the head is real. The host
			    builds the string once and hands it to both rather than writing it twice: two
			    copies of a sentence agree until the day one is edited. */}
			<span className="line-photo-foot">
				{heading ? <span className="section-label line-card-title line-photo-heading">{heading}</span> : null}
				{name ? <span className="line-photo-name">{name}</span> : null}
				{photo.present ? (
					<span className="line-photo-actions">
						<button type="button" className="line-photo-action"
							onClick={() => file.current?.click()}>Replace</button>
						<span className="line-photo-sep" aria-hidden="true">|</span>
						<button type="button" className="line-photo-action line-photo-action-remove"
							onClick={onClear}>Remove</button>
					</span>
				) : (
					/* Only over an empty frame: dropping and pasting leave no mark on screen, so
					   nothing else says they work. */
					<span className="field-help line-photo-hint">Drop a photo here, or paste one you copied</span>
				)}
			</span>
		</div>
	)
}
