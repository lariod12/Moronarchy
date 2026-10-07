import type { ReactNode } from "react";
import { cx } from "../../ui/cx";
import { StatList } from "../../ui/StatTag/StatTag";
import { Tag } from "../../ui/Tag/Tag";
import "./InfoCard.css";

export interface InfoCardProps {
  title: string;
  stats: Array<{ label: string; value: string | number }>;
  icon: ReactNode;
  // Small tag in the top-left corner (e.g. "x1").
  corner?: string;
  // Controls on both sides of the title (e.g. the previous / next king buttons).
  titleStart?: ReactNode;
  titleEnd?: ReactNode;
  // A text box across the bottom of the card.
  note?: ReactNode;
  // Buttons that hang over the bottom edge of the card.
  actions?: ReactNode;
  muted?: boolean;
  className?: string;
  "data-testid"?: string;
}

// The big framed card of the wireframes (Players Info, Plot, Resident, Item): title, stat tags down the left, a big icon.
export const InfoCard = ({ title, stats, icon, corner, titleStart, titleEnd, note, actions, muted = false, className, "data-testid": testId }: InfoCardProps) => (
  <div className={cx("info-card-wrap", actions !== undefined && "info-card-wrap--actions", className)} data-testid={testId}>
    <section className="info-card" aria-label={title}>
      <header className="info-card__header">
        {titleStart ?? <span className="info-card__side" />}
        <h2 className="info-card__title">{title}</h2>
        {titleEnd ?? <span className="info-card__side" />}
      </header>
      {corner ? <Tag className="info-card__corner">{corner}</Tag> : null}
      <div className="info-card__body">
        <StatList stats={stats} muted={muted} className="info-card__stats" />
        <div className="info-card__icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      {note ? <div className="info-card__note">{note}</div> : null}
    </section>
    {actions ? <div className="info-card__actions">{actions}</div> : null}
  </div>
);
