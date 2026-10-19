import {
	WebAuthnAbortService, WebAuthnError, browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, startRegistration
} from '@simplewebauthn/browser'
import { addPasskey, finishPasskeySignIn, startAddingPasskey, startPasskeySignIn } from '../api/client.js'

/** Whether this page can use passkeys: the server names the one address they work at, and the browser has them. */
export const passkeysHere = options => Boolean(options?.passkeys) && options.passkeys === location.origin && browserSupportsWebAuthn()

/** A prompt the reader closed, or one a newer prompt replaced: neither is worth a word (20a). */
export const closedPrompt = error => ['NotAllowedError', 'AbortError'].includes(error?.name) || error?.code === 'ERROR_CEREMONY_ABORTED'

/** The device refused, rather than the server: its own message is not written for the reader. */
export const deviceFailed = error => error instanceof WebAuthnError

/** Ends a waiting offer, as the page that made it closes. */
export const stopPasskeyOffer = () => WebAuthnAbortService.cancelCeremony()

/** The device already holds a passkey for this account, so it offered none to add. */
export const alreadyHere = error => error?.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'

/** Signs in through the device's prompt, or with `autofill` the email field's offer; null when there is none.
    `remember` is asked once the device answers: an offer can wait while "Stay signed in" changes. */
export async function signInWithPasskey({ autofill = false, remember = () => true } = {}) {
	if (autofill && !(await browserSupportsWebAuthnAutofill())) return null
	const { ticket, options } = await startPasskeySignIn()
	const response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: autofill })
	return finishPasskeySignIn(ticket, response, remember())
}

/** Adds a passkey to the signed-in account through the device's own prompt. */
export async function addPasskeyHere(password) {
	const options = await startAddingPasskey(password)
	return addPasskey(await startRegistration({ optionsJSON: options }))
}
