import { describe, expect, it, vi } from "vitest";
import {
  createRefreshLockRunner,
  REFRESH_LOCK_NAME,
  runWithRefreshLock,
} from "./refresh-lock";

describe("refresh lock", () => {
  it("executes inside the named browser Web Lock", async () => {
    const events: string[] = [];
    const requestSpy = vi.fn();
    const request = async <T>(
      name: string,
      callback: () => Promise<T>,
    ): Promise<T> => {
      requestSpy(name);
      events.push(`lock:${name}`);
      const result = await callback();
      events.push("unlock");
      return result;
    };
    const runner = createRefreshLockRunner({ request });

    await expect(
      runner(async () => {
        events.push("refresh");
        return "new-session";
      }),
    ).resolves.toBe("new-session");
    expect(events).toEqual([`lock:${REFRESH_LOCK_NAME}`, "refresh", "unlock"]);
    expect(requestSpy).toHaveBeenCalledWith(REFRESH_LOCK_NAME);
  });

  it("falls back without persistence when Web Locks are unavailable", async () => {
    const operation = vi.fn().mockResolvedValue("fallback-session");

    await expect(createRefreshLockRunner(undefined)(operation)).resolves.toBe(
      "fallback-session",
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("detects Web Locks at call time after a server-side module load", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "locks",
    );
    const request = vi.fn(
      async <T>(_name: string, callback: () => Promise<T>): Promise<T> =>
        callback(),
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });

    try {
      await expect(
        runWithRefreshLock(() => Promise.resolve("restored-session")),
      ).resolves.toBe("restored-session");
      expect(request).toHaveBeenCalledWith(
        REFRESH_LOCK_NAME,
        expect.any(Function),
      );
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(navigator, "locks", originalDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "locks");
      }
    }
  });
});
