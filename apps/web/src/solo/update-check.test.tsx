import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateBannerView } from "./UpdateBanner";
import { canCheckForUpdates, fetchDeployedBuild, useUpdateAvailable } from "./update-check";

const respond = (build: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => ({ build }) }));

describe("update check", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the deployed build and tolerates failures", async () => {
    expect(await fetchDeployedBuild(respond("abc"))).toBe("abc");
    expect(await fetchDeployedBuild(respond("abc", false))).toBeNull();
    expect(await fetchDeployedBuild(respond(42))).toBeNull();
    expect(await fetchDeployedBuild(vi.fn(async () => Promise.reject(new TypeError("offline"))))).toBeNull();
  });

  it("only checks over http(s) for a stamped build", () => {
    expect(canCheckForUpdates("abc", "https:")).toBe(true);
    expect(canCheckForUpdates("abc", "file:")).toBe(false);
    expect(canCheckForUpdates(undefined, "https:")).toBe(false);
  });

  it("flags a newer deploy on a later poll and stops polling", async () => {
    vi.useFakeTimers();
    let deployed = "old";
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ build: deployed }) }));
    const { result } = renderHook(() => useUpdateAvailable("old", 1000, fetchImpl));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe(false);
    deployed = "new";
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe(true);
    const calls = fetchImpl.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchImpl.mock.calls.length).toBe(calls);
  });

  it("never polls without a build id", async () => {
    vi.useFakeTimers();
    const fetchImpl = respond("new");
    const { result } = renderHook(() => useUpdateAvailable(undefined, 1000, fetchImpl));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("offers a reload", () => {
    const onReload = vi.fn();
    render(<UpdateBannerView onReload={onReload} />);
    expect(screen.getByRole("status")).toHaveTextContent("New version available");
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalled();
  });
});
