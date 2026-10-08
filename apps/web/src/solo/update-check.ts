import { useEffect, useState } from "react";

// The GitHub Pages build stamps its commit into the bundle (VITE_BUILD_ID) and next to it in version.json. A page that
// stays open on a phone polls version.json and learns when a newer deploy is live, so the reviewer can reload.
export const BUILD_ID: string | undefined = import.meta.env.VITE_BUILD_ID || undefined;
export const UPDATE_CHECK_INTERVAL_MS = 30_000;

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "json">>;

// Returns the deployed build id, or null when it cannot be read (offline, file://, no version.json).
export const fetchDeployedBuild = async (fetchImpl: FetchLike, url = "./version.json"): Promise<string | null> => {
  try {
    const response = await fetchImpl(`${url}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { build?: unknown };
    return typeof body.build === "string" && body.build.length > 0 ? body.build : null;
  } catch {
    return null;
  }
};

export const canCheckForUpdates = (currentBuild: string | undefined, protocol: string): boolean =>
  Boolean(currentBuild) && (protocol === "https:" || protocol === "http:");

// True once a different build than this page's is deployed. Polling stops at that point.
export const useUpdateAvailable = (
  currentBuild: string | undefined = BUILD_ID,
  intervalMs = UPDATE_CHECK_INTERVAL_MS,
  fetchImpl: FetchLike = (input, init) => fetch(input, init)
): boolean => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!canCheckForUpdates(currentBuild, window.location.protocol)) {
      return undefined;
    }
    let stopped = false;
    const check = async () => {
      const deployed = await fetchDeployedBuild(fetchImpl);
      if (!stopped && deployed && deployed !== currentBuild) {
        stopped = true;
        window.clearInterval(timer);
        setAvailable(true);
      }
    };
    const timer = window.setInterval(() => void check(), intervalMs);
    void check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [currentBuild, intervalMs, fetchImpl]);

  return available;
};
