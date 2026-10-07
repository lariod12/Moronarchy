import type { AbsentStatus } from "../../game/useAbsentCountdown";
import "./ConnectionBanners.css";

// This client lost its connection to the server; moves are not sent until it is back.
export const ConnectionBanner = ({ connected }: { connected: boolean }) =>
  connected ? null : (
    <p role="status" data-testid="connection-banner" className="shell-banner shell-banner--connection">
      Reconnecting…
    </p>
  );

export interface AbsentBannerProps {
  status: AbsentStatus | null;
  // Name of the king in `status`.
  name: string;
}

// The game waits on a king who is offline: the server removes them after a while (see useAbsentCountdown).
export const AbsentBanner = ({ status, name }: AbsentBannerProps) => {
  if (!status) {
    return null;
  }
  if (status.kind === "reconnected") {
    return (
      <p role="status" data-testid="absent-banner" data-state="reconnected" className="shell-banner">
        {name} reconnected
      </p>
    );
  }
  return (
    <p role="status" data-testid="absent-banner" data-state="absent" className="shell-banner shell-banner--absent">
      {status.secondsLeft > 0 ? `${name} disconnected — removed in ~${status.secondsLeft}s` : `${name} disconnected — removing…`}
    </p>
  );
};
