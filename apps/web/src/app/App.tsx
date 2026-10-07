import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { RoomRoute } from "../screens/room/RoomRoute";
import { WelcomeScreen } from "../screens/welcome/WelcomeScreen";

const GalleryPage = import.meta.env.DEV ? lazy(() => import("../dev/gallery/GalleryPage")) : null;

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/room/:roomCode/*" element={<RoomRoute />} />
      {GalleryPage ? (
        <>
          <Route
            path="/dev/gallery"
            element={
              <Suspense fallback={null}>
                <GalleryPage />
              </Suspense>
            }
          />
          <Route
            path="/dev/gallery/:entryId"
            element={
              <Suspense fallback={null}>
                <GalleryPage />
              </Suspense>
            }
          />
        </>
      ) : null}
    </Routes>
  );
};
