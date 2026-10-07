import { Link } from "react-router";
import { SketchBox } from "../ui/SketchBox/SketchBox";

export const HomePlaceholder = () => {
  return (
    <main className="phone-frame placeholder">
      <SketchBox title="Moronarchy" shadow>
        <p>Đang xây lại giao diện</p>
        {import.meta.env.DEV ? <Link to="/dev/gallery">Mở gallery</Link> : null}
      </SketchBox>
    </main>
  );
};
