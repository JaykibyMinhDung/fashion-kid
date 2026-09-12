import {
  type AuthSession,
  type ChangePasswordInput,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "../contracts";
import {
  type RefreshLockRunner,
  runWithRefreshLock,
} from "../session/refresh-lock";
import { ApiClientError, apiRequest } from "@/lib/api/api-client";

export type AuthClient = {
  getCurrentUser(): PublicUser | null;
  synchronizeCurrentUser(user: PublicUser): void;
  login(input: LoginInput): Promise<PublicUser>;
  register(input: RegisterInput): Promise<PublicUser>;
  refresh(): Promise<PublicUser>;
  logout(): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  authorizedRequest<T>(path: `/${string}`, init?: RequestInit): Promise<T>;
};

type AuthClientOptions = {
  fetchImplementation?: typeof fetch;
  refreshLock?: RefreshLockRunner;
};

export function createAuthClient({
  fetchImplementation = fetch,
  refreshLock = runWithRefreshLock,
}: AuthClientOptions = {}): AuthClient {
  let accessToken: string | null = null;
  let currentUser: PublicUser | null = null;
  let refreshInFlight: Promise<PublicUser> | null = null;

  const acceptSession = (session: AuthSession): PublicUser => {
    accessToken = session.accessToken;
    currentUser = session.user;
    return session.user;
  };

  const clearSession = (): void => {
    accessToken = null;
    currentUser = null;
  };

  const request = <T>(path: `/${string}`, init: RequestInit = {}) =>
    apiRequest<T>(path, init, fetchImplementation);

  const refresh = (): Promise<PublicUser> => {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = refreshLock(async () => {
      const session = await request<AuthSession>("/api/v1/auth/refresh", {
        method: "POST",
      });
      return acceptSession(session);
    })
      .catch((error: unknown) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  };

  const authorizedRequest = async <T>(
    path: `/${string}`,
    init: RequestInit = {},
  ): Promise<T> => {
    if (!accessToken) {
      await refresh();
    }

    const execute = () => {
      const headers = new Headers(init.headers);
      if (accessToken) {
        headers.set("authorization", `Bearer ${accessToken}`);
      }
      return request<T>(path, { ...init, headers });
    };

    try {
      return await execute();
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) {
        throw error;
      }
    }

    await refresh();
    try {
      return await execute();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearSession();
      }
      throw error;
    }
  };

  return {
    getCurrentUser: () => currentUser,
    synchronizeCurrentUser(user) {
      if (!accessToken || !currentUser || currentUser.id !== user.id) {
        throw new Error("Cannot synchronize an inactive authentication session");
      }
      currentUser = user;
    },
    async login(input) {
      const session = await request<AuthSession>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return acceptSession(session);
    },
    async register(input) {
      const session = await request<AuthSession>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return acceptSession(session);
    },
    refresh,
    async logout() {
      try {
        await request<void>("/api/v1/auth/logout", { method: "POST" });
      } finally {
        clearSession();
      }
    },
    async changePassword(input) {
      await authorizedRequest<void>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(input),
      });
      clearSession();
    },
    authorizedRequest,
  };
}
