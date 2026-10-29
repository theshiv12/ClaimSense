// Decorative icons: always next to a word, so aria-hidden.
const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const;

export const CheckIcon = () => (
  <svg {...base}><path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const MinusIcon = () => (
  <svg {...base}><path d="M3.5 8h9" strokeLinecap="round" /></svg>
);
export const CrossIcon = () => (
  <svg {...base}><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
);
export const QuestionIcon = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.5" /><path d="M6.3 6.2a1.8 1.8 0 113 1.4c-.8.5-1.3.9-1.3 1.7M8 11.5v.01" strokeLinecap="round" /></svg>
);
