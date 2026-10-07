import "./BlockingOverlay.css";

export interface BlockingOverlayProps {
  title: string;
  subtitle?: string;
}

export const BlockingOverlay = ({ title, subtitle }: BlockingOverlayProps) => (
  <div className="ui-blocking-overlay" role="status" aria-live="polite">
    <div className="ui-blocking-overlay__box">
      <p className="ui-blocking-overlay__title">{title}</p>
      {subtitle ? <p className="ui-blocking-overlay__subtitle">{subtitle}</p> : null}
    </div>
  </div>
);
