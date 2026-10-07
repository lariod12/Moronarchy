import { useState } from "react";
import { Link, useParams } from "react-router";
import { GALLERY_ENTRIES } from "./entries";
import "./gallery.css";

const GalleryIndex = () => {
  const groups = Array.from(new Set(GALLERY_ENTRIES.map((entry) => entry.group)));
  return (
    <div className="gallery">
      <div className="phone-frame gallery__frame">
        <div className="gallery__body">
          <h1>Gallery</h1>
          {groups.map((group) => (
            <section key={group}>
              <h2 className="gallery__group">{group}</h2>
              <ul className="gallery__list">
                {GALLERY_ENTRIES.filter((entry) => entry.group === group).map((entry) => (
                  <li key={entry.id}>
                    <Link to={`/dev/gallery/${entry.id}`} data-testid="gallery-link">
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

const GalleryEntryView = ({ entryId }: { entryId: string }) => {
  const [lastAction, setLastAction] = useState("");
  const entry = GALLERY_ENTRIES.find((candidate) => candidate.id === entryId);
  const isBare = Boolean(entry?.id.startsWith("shell-") || entry?.group === "Screens" || entry?.group === "Game" || entry?.group === "Fight" || entry?.group === "Info");

  return (
    <div className="gallery">
      <div className="gallery__bar">
        <Link to="/dev/gallery">Back to gallery</Link>
        <output data-testid="gallery-last-action">{lastAction}</output>
      </div>
      <div className="phone-frame gallery__frame" data-gallery-entry={entry ? entry.id : undefined}>
        {entry ? (
          <div className={isBare ? "gallery__body gallery__body--bare" : "gallery__body"}>{entry.render(setLastAction)}</div>
        ) : (
          <p className="gallery__body">Unknown entry</p>
        )}
      </div>
    </div>
  );
};

const GalleryPage = () => {
  const { entryId } = useParams();
  return entryId ? <GalleryEntryView entryId={entryId} /> : <GalleryIndex />;
};

export default GalleryPage;
