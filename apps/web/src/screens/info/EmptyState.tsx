import "./info-page.css";

export const EmptyState = ({ text }: { text: string }) => (
  <p className="info-empty" data-testid="info-empty">
    {text}
  </p>
);
