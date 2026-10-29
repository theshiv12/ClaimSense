/** If the insurer rejects or cuts the claim: the escalation path in India. */
export function RejectionSteps() {
  const steps = [
    ['Write to the insurer', 'Ask for the reason in writing and reply to the insurer’s grievance officer, quoting the clause. They must answer within 14 days.'],
    ['Bima Bharosa', 'If the answer does not resolve it, register the complaint on IRDAI’s Bima Bharosa portal (bimabharosa.irdai.gov.in) or call 155255.'],
    ['Insurance Ombudsman', 'Still unresolved after 30 days, or unhappy with the reply? Complain to the Insurance Ombudsman for your area, free of charge, within one year of the insurer’s final reply.'],
  ];
  return (
    <ol className="space-y-3">
      {steps.map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">{i + 1}</span>
          <div>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="text-sm text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
