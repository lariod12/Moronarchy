import { getEventHistoryView } from "@moronarchy/core/engine";
import type { EventHistoryItem, GameState, PlayerId } from "@moronarchy/core/engine";
import { eventIcon } from "../../game/game-icons";
import { GLOBAL_EVENT_LABELS, PERSONAL_EVENT_LABELS, isGlobalEventId } from "../../game/labels";
import { Tabs } from "../../ui/Tabs/Tabs";
import { Tag } from "../../ui/Tag/Tag";
import { EmptyState } from "../info/EmptyState";
import "../info/info-page.css";
import "./EventsView.css";

export interface EventsViewProps {
  game: GameState;
  viewerId: PlayerId;
}

export const durationLabel = (rounds: number): string => (rounds <= 0 ? "Instant" : rounds === 1 ? "1 Round" : `${rounds} Rounds`);

export const targetLabel = (item: EventHistoryItem): string => (item.target === "all" ? "All" : item.target === "you" ? "You" : (item.playerName ?? "Someone"));

export const activeLabel = (roundsLeft: number): string => `Active · ${roundsLeft} ${roundsLeft === 1 ? "round" : "rounds"} left`;

const eventName = (item: EventHistoryItem): string =>
  isGlobalEventId(item.eventId) ? GLOBAL_EVENT_LABELS[item.eventId].name : PERSONAL_EVENT_LABELS[item.eventId as keyof typeof PERSONAL_EVENT_LABELS].name;

// History Events, newest first. Global events that are still running are pinned on top.
export const EventsView = ({ game, viewerId }: EventsViewProps) => {
  const events = getEventHistoryView(game, viewerId);
  return (
    <div className="info-page info-page--fill events" data-testid="events-page">
      <Tabs tabs={[{ key: "history", label: "History Events" }]} active="history" onChange={() => undefined} label="Events" />
      {events.length === 0 ? (
        <EmptyState text="No events yet" />
      ) : (
        <ul className="info-list info-scroll events__list" data-testid="events-list">
          {events.map((item) => (
            <li key={item.seq} className="event-card" data-testid="event-card" data-active={item.active ? "true" : "false"} data-event={item.eventId}>
              <div className="event-card__head">
                <span className="event-card__icon" aria-hidden="true">
                  {eventIcon(item.eventId, 24)}
                </span>
                <span className="event-card__name">{eventName(item)}</span>
              </div>
              <p className="event-card__text">{`"${item.description}"`}</p>
              <div className="event-card__tags">
                {item.active && item.roundsLeft !== null ? <Tag className="event-card__active">{activeLabel(item.roundsLeft)}</Tag> : null}
                <Tag>{targetLabel(item)}</Tag>
                <Tag>{durationLabel(item.durationRounds)}</Tag>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
