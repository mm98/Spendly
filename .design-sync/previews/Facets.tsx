import { Facets, FieldGroup, FieldGroupValues, FieldGroupMore, Choice, Check } from 'spendly-react';

const count = (n: string) => <><span className="sp-grow" /><span className="sp-field-group__count">{n}</span></>;

export const Rail = () => (
	<div style={{ maxWidth: 280 }}>
		<Facets>
			<FieldGroup facet legend="Status">
				<Choice control={<Check checked onChange={() => {}} />}>Approved{count('18')}</Choice>
				<Choice control={<Check checked={false} onChange={() => {}} />}>Ordered{count('6')}</Choice>
				<Choice control={<Check checked={false} disabled onChange={() => {}} />}>Returned{count('0')}</Choice>
			</FieldGroup>
			<FieldGroup facet legend="Receipt">
				<Choice control={<Check checked={false} onChange={() => {}} />}>Attached{count('21')}</Choice>
				<Choice control={<Check checked={false} onChange={() => {}} />}>Missing{count('3')}</Choice>
			</FieldGroup>
			<FieldGroup facet legend="Vendor" count="14 total">
				<FieldGroupValues>
					<Choice control={<Check checked onChange={() => {}} />}><span className="sp-truncate">Indbo Møbler</span>{count('9')}</Choice>
					<Choice control={<Check checked={false} onChange={() => {}} />}><span className="sp-truncate">Bilka</span>{count('7')}</Choice>
					<Choice control={<Check checked={false} onChange={() => {}} />}><span className="sp-truncate">IKEA</span>{count('5')}</Choice>
					<Choice control={<Check checked={false} onChange={() => {}} />}><span className="sp-truncate">HAY</span>{count('2')}</Choice>
				</FieldGroupValues>
				<FieldGroupMore onClick={() => {}}>Show 10 more</FieldGroupMore>
			</FieldGroup>
		</Facets>
	</div>
);
