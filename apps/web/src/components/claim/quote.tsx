/** A verbatim line from a document or the policy wording, with where it came from. */
export function Quote({ text, where }: { text: string; where: string }) {
  return (
    <blockquote className="border-l-2 border-teal/40 pl-3 text-xs text-muted">
      <span className="italic">“{text}”</span> <span className="not-italic">({where})</span>
    </blockquote>
  );
}
