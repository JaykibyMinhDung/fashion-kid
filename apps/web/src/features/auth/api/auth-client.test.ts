import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "../contracts";
import type { RefreshLockRunner } from "../session/refresh-lock";
import { createAuthClient } from "./auth-client";

const SESSION: AuthSession = {
  accessToken: "first-access-token",
  tokenType: "Bearer",
  expiresIn: 900,
  user: {
    id: "user-id",
    email: "user@example.com",
    fullName: "Test User",
    phone: null,
    avatarUrl: null,
    role: "CUSTOMER",
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("memory-only auth client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("single-flights simultaneous refresh calls in one tab", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      await pending;
      return jsonResponse(SESSION);
    });
    const refreshLockSpy = vi.fn();
    const refreshLock: RefreshLockRunner = async <T>(
      operation: () => Promise<T>,
    ) => {
      refreshLockSpy();
      return operation();
    };
    const client = createAuthClient({
      fetchImplementation: fetchMock,
      refreshLock,
    });

    const first = client.refresh();
    const second = client.refresh();
    release?.();

    await expect(Promise.all([first, second])).resolves.toEqual([
      SESSION.user,
      SESSION.user,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshLockSpy).toHaveBeenCalledTimes(1);
  });

  it("retries a protected request exactly once with a rotated token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const authorizationHeaders: Array<string | null> = [];
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/login")) {
        return Promise.resolve(jsonResponse(SESSION));
      }
      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.resolve(
          jsonResponse({ ...SESSION, accessToken: "rotated-access-token" }),
        );
      }
      authorizationHeaders.push(
        new Headers(init?.headers).get("authorization"),
      );
      return Promise.resolve(
        authorizationHeaders.length === 1
          ? jsonResponse(
              {
                statusCode: 401,
                code: "INVALID_SESSION",
                message: "invalid",
              },
              401,
            )
          : jsonResponse({ protected: true }),
      );
    });
    const client = createAuthClient({ fetchImplementation: fetchMock });
    await client.login({
      email: "user@example.com",
      password: "a sufficiently long password",
      remember: false,
    });

    await expect(
      client.authorizedRequest<{ protected: boolean }>("/protected"),
    ).resolves.toEqual({ protected: true });
    expect(authorizationHeaders).toEqual([
      "Bearer first-access-token",
      "Bearer rotated-access-token",
    ]);
  });

  it("clears the memory session when refresh fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(SESSION))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            statusCode: 401,
            code: "INVALID_SESSION",
            message: "invalid",
          },
          401,
        ),
      );
    const client = createAuthClient({ fetchImplementation: fetchMock });
    await client.login({
      email: "user@example.com",
      password: "a sufficiently long password",
      remember: false,
    });

    await expect(client.refresh()).rejects.toMatchObject({
      code: "INVALID_SESSION",
    });
    expect(client.getCurrentUser()).toBeNull();
  });

  it("never reads or writes browser storage and exposes no access token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const localGet = vi.spyOn(Storage.prototype, "getItem");
    const localSet = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(SESSION));
    const client = createAuthClient({ fetchImplementation: fetchMock });

    await client.login({
      email: "user@example.com",
      password: "a sufficiently long password",
      remember: false,
    });

    expect(localGet).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
    expect(Object.keys(client)).not.toContain("accessToken");
    expect(JSON.stringify(client)).not.toContain("first-access-token");
  });

  it("synchronizes profile data only for the active session user", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(SESSION));
    const client = createAuthClient({ fetchImplementation: fetchMock });
    const updatedUser = { ...SESSION.user, fullName: "Updated User" };

    expect(() => client.synchronizeCurrentUser(updatedUser)).toThrow(
      "inactive authentication session",
    );
    await client.login({
      email: "user@example.com",
      password: "a sufficiently long password",
      remember: false,
    });

    client.synchronizeCurrentUser(updatedUser);

    expect(client.getCurrentUser()).toEqual(updatedUser);
    expect(() =>
      client.synchronizeCurrentUser({ ...updatedUser, id: "another-user" }),
    ).toThrow("inactive authentication session");
  });
});
