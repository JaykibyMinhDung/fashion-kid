"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AuthClient,
  createAuthClient,
} from "../api/auth-client";
import type {
  ChangePasswordInput,
  LoginInput,
  PublicUser,
  RegisterInput,
} from "../contracts";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export type AuthContextValue = {
  status: AuthStatus;
  user: PublicUser | null;
  login(input: LoginInput): Promise<PublicUser>;
  register(input: RegisterInput): Promise<PublicUser>;
  logout(): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  synchronizeCurrentUser(user: PublicUser): void;
  authorizedRequest<T>(path: `/${string}`, init?: RequestInit): Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  client: suppliedClient,
}: {
  children: ReactNode;
  client?: AuthClient;
}) {
  const [client] = useState(() => suppliedClient ?? createAuthClient());
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    if (bootstrapStarted.current) {
      return;
    }
    bootstrapStarted.current = true;

    void client.refresh().then(
      (restoredUser) => {
        setUser(restoredUser);
        setStatus("authenticated");
      },
      () => {
        setUser(null);
        setStatus("anonymous");
      },
    );
  }, [client]);

  const login = useCallback(
    async (input: LoginInput) => {
      const authenticatedUser = await client.login(input);
      setUser(authenticatedUser);
      setStatus("authenticated");
      return authenticatedUser;
    },
    [client],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const authenticatedUser = await client.register(input);
      setUser(authenticatedUser);
      setStatus("authenticated");
      return authenticatedUser;
    },
    [client],
  );

  const logout = useCallback(async () => {
    try {
      await client.logout();
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, [client]);

  const changePassword = useCallback(
    async (input: ChangePasswordInput) => {
      await client.changePassword(input);
      setUser(null);
      setStatus("anonymous");
    },
    [client],
  );

  const authorizedRequest = useCallback(
    async <T,>(path: `/${string}`, init?: RequestInit): Promise<T> => {
      try {
        return await client.authorizedRequest<T>(path, init);
      } finally {
        const refreshedUser = client.getCurrentUser();
        setUser(refreshedUser);
        setStatus(refreshedUser ? "authenticated" : "anonymous");
      }
    },
    [client],
  );

  const synchronizeCurrentUser = useCallback(
    (updatedUser: PublicUser) => {
      client.synchronizeCurrentUser(updatedUser);
      setUser(updatedUser);
      setStatus("authenticated");
    },
    [client],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      register,
      logout,
      changePassword,
      synchronizeCurrentUser,
      authorizedRequest,
    }),
    [
      status,
      user,
      login,
      register,
      logout,
      changePassword,
      synchronizeCurrentUser,
      authorizedRequest,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
