import { ChatThread, ChatMessage, ChatReply, ChatFigures, SpendlyMark } from 'spendly-react';

const box = { maxWidth: 640 } as const;

export const Answered = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:18">
				<ChatReply>
					<p>Your three biggest orders in August:</p>
					<ul>
						<li><a href="#/orders/SPENDLY-447">SPENDLY-447</a> at Indbo Møbler, <span className="sp-amount">24.310,00 kr.</span></li>
						<li><a href="#/orders/SPENDLY-452">SPENDLY-452</a> at IKEA, <span className="sp-amount">6.880,00 kr.</span></li>
						<li><a href="#/orders/SPENDLY-439">SPENDLY-439</a> at Bilka, <span className="sp-amount">1.640,00 kr.</span></li>
					</ul>
				</ChatReply>
			</ChatMessage>
		</ChatThread>
	</div>
);

export const WithFigures = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mark={<SpendlyMark />}>
				<ChatReply>
					<p>Spending per category in September:</p>
					<ChatFigures>
						<table className="sp-table sp-table--compact sp-table--static">
							<thead><tr><th>Category</th><th className="sp-col-number">Orders</th><th className="sp-col-amount">Total</th></tr></thead>
							<tbody>
								<tr><td>Groceries</td><td className="sp-col-number">9</td><td className="sp-col-amount">5.420,00</td></tr>
								<tr><td>Furniture</td><td className="sp-col-number">2</td><td className="sp-col-amount">8.258,00</td></tr>
								<tr><td>Decor</td><td className="sp-col-number">4</td><td className="sp-col-amount">1.310,50</td></tr>
							</tbody>
						</table>
					</ChatFigures>
				</ChatReply>
			</ChatMessage>
		</ChatThread>
	</div>
);

export const Working = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mark={<SpendlyMark />}>
				<ChatReply state="working" doing="Reading your orders" />
			</ChatMessage>
		</ChatThread>
	</div>
);

export const Failed = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mark={<SpendlyMark />} time="09:42" sentAt="2026-10-24T09:42:05">
				<ChatReply state="failed" onRetry={() => {}} />
			</ChatMessage>
		</ChatThread>
	</div>
);
