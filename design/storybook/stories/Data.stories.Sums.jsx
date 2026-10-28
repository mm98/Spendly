export const Sums = {
	render: () => (
		<div style={{ maxWidth: 420 }}>
			<Card>
				<SumHead mark={<Mark size="medium" fill="solid">Indbo Møbler</Mark>} title="Indbo Møbler" subtitle="SPENDLY-441 · 8 August" />
				<div className="sp-stack">
					<Sum value="3.640,00 kr.">Items</Sum>
					<Sum value="340,00 kr.">Shipping</Sum>
					<Sum variant="total" value="3.980,00 kr.">Total</Sum>
				</div>
			</Card>
		</div>
	)
}
