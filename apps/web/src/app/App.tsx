import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { RoomRoute } from "../screens/room/RoomRoute";
import { WelcomeScreen } from "../screens/welcome/WelcomeScreen";

// The solo mode is a separate chunk: nothing of it loads until someone opens /solo.
const SoloSetupRoute = lazy(() => import("../solo/SoloRoutes").then((module) => ({ default: module.SoloSetupRoute })));
const SoloPlayRoute = lazy(() => import("../solo/SoloRoutes").then((module) => ({ default: module.SoloPlayRoute })));

const GalleryPage = import.meta.env.DEV ? lazy(() => import("../dev/gallery/GalleryPage")) : null;

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route
        path="/solo"
        element={
          <Suspense fallback={null}>
            <SoloSetupRoute canGoBack />
          </Suspense>
        }
      />
      <Route
        path="/room/SOLO/*"
        element={
          <Suspense fallback={null}>
            <SoloPlayRoute />
          </Suspense>
        }
      />
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
