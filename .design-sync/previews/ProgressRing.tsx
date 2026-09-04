import { AiCard, Button, ProgressRing } from 'spendly-react'

/* A 40px dial reading "<done>/<total>", with the ring drawn to exactly that fraction. It is
   built for the dark card: the hole is painted in the dark card's own colour and the unfilled
   part of the ring is white at 22%, so on a light surface the figure inside it disappears.
   Put it on an AiCard, or on nothing.

   Both numbers are counts, not percentages -- the component does the division. A total of 0
   draws an empty ring rather than dividing by zero. */

export const OnboardingDial = () => (
	<AiCard headline="Finish setting up Spendly"
		body="Two steps left: add your first vendor, then scan a receipt so Spendly can read the lines for you.">
		<ProgressRing done={1} total={3} />
		<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
	</AiCard>
)

/* Every reading the dial can show. The fill is computed from done/total, so nothing is stuck
   at a third: none done is an empty ring, all done is a closed one. */
export const Sweep = () => (
	<AiCard headline="Getting started"
		body="Three steps to a set-up account, from none done to all three.">
		<ProgressRing done={0} total={3} />
		<ProgressRing done={1} total={3} />
		<ProgressRing done={2} total={3} />
		<ProgressRing done={3} total={3} />
	</AiCard>
)
