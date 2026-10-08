import { useUpdateAvailable } from "./update-check";
import "./UpdateBanner.css";

export interface UpdateBannerViewProps {
  onReload: () => void;
}

// A strip on top of everything: the reviewer's open page is behind the latest deploy. The solo game is saved in
// localStorage, so reloading keeps the running game.
export const UpdateBannerView = ({ onReload }: UpdateBannerViewProps) => (
  <div className="update-banner" role="status">
    <span>New version available</span>
    <button type="button" className="update-banner__button" onClick={onReload}>
      Reload
    </button>
  </div>
);

export const UpdateBanner = () => {
  const available = useUpdateAvailable();
  return available ? <UpdateBannerView onReload={() => window.location.reload()} /> : null;
};
