import { useEffect, useRef, useState } from 'react'
import { ImageOrIcon } from './Icon.jsx'
import { HiddenFileInput } from './FileInput.jsx'
import { PHOTO_FILES } from './fileKinds.js'

/* The picture beside a card's fields: an order line's product photo, a wish's.

   One frame, one set of words, one way in. The two cards that draw it are not the same form —
   an item has a quantity and a price paid, a wish has a link — but the picture is the same
   picture, taken the same three ways: the frame is clicked, a file is dropped on the card, or
   one is pasted into it. Two copies of that would be two answers to "what does an empty frame
   say", and the frame is the half of the card a reader looks at first.

   `photo` is what the host knows: `{ present, src }` — a file picked in this session, an
   image already on the server, or neither. The host decides which, because only it knows
   whether a record has been saved yet. */

/* Only an image, and only the first of them: the frame holds one picture, so a folder dropped
   on it fills the frame rather than failing. The picker, the drop and the paste all read a
   FileList, so they all read it through here. */
const firstImage = list => [...(list ?? [])].find(f => f.type.startsWith('image/'))

/** The two ways in that are not the frame itself: dropping, and pasting.

    `dropProps` go on the card or the block around the frame, not on the frame: a photo dropped
    there is a photo meant for it, and a 96px target is a small thing to ask someone to hit.

    Pasting is a window listener rather than a handler among them, because a paste is delivered
    to whatever holds focus and then bubbles from there -- so a handler on an element that
    cannot hold focus never runs, and one on a card only runs while the cursor happens to be
    inside it. The frame says "paste one you copied" with no conditions attached, so the
    listener has none either: while this form is open, a copied image goes in the frame wherever
    the cursor is. A paste carrying no image is left entirely alone, which is every paste into
    a text field. */
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

/** The frame, its file picker, and the lines under it.
 *
 *  `heading` and `name` are the card's own header, drawn here only on a phone (see the note on
 *  the foot below) — a host that already has a headline of its own passes neither. */
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
					/* Only over an empty frame. Dropping and pasting leave no mark on the screen,
					   so the sentence is the only way anyone finds out they work — which is worth a
					   line while the frame is empty and the reader is looking for the way in. Once
					   there is a photo, Replace is a visible control answering the same question,
					   the two gestures still work, and the sentence is a third row in a column
					   standing beside the fields. */
					<span className="field-help line-photo-hint">Drop a photo here, or paste one you copied</span>
				)}
			</span>
		</div>
	)
}
