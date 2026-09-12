import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthClient } from "./api/auth-client";
import { ChangePasswordForm } from "./components/change-password-form";
import { LoginForm } from "./components/login-form";
import { LogoutButton } from "./components/logout-button";
import type { AuthSession, PublicUser, RoleCode } from "./contracts";
import { landingPathForRole } from "./role-routing";
import { AuthProvider, useAuth } from "./session/auth-provider";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function invalidSession(): Response {
  return jsonResponse(
    {
      statusCode: 401,
      code: "INVALID_SESSION",
      message: "Phiên đăng nhập không hợp lệ",
    },
    401,
  );
}

function createFakeAuthServer(role: RoleCode, initiallyActive = false) {
  const user: PublicUser = {
    id: "user-id",
    email: "user@example.com",
    fullName: "Integration User",
    phone: null,
    avatarUrl: null,
    role,
  };
  let active = initiallyActive;
  let tokenSequence = 0;
  let protectedCalls = 0;
  const paths: string[] = [];
  const credentials: Array<RequestCredentials | undefined> = [];
  const authorization: Array<string | null> = [];
  const bodies: unknown[] = [];

  const issueSession = (): AuthSession => ({
    accessToken: `access-${++tokenSequence}`,
    tokenType: "Bearer",
    expiresIn: 900,
    user,
  });

  const fetchImplementation = vi.fn<typeof fetch>(async (input, init) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    credentials.push(init?.credentials);

    if (path === "/api/v1/auth/login") {
      active = true;
      bodies.push(JSON.parse(String(init?.body)));
      return jsonResponse(issueSession());
    }
    if (path === "/api/v1/auth/refresh") {
      return active ? jsonResponse(issueSession()) : invalidSession();
    }
    if (path === "/api/v1/auth/logout") {
      active = false;
      return new Response(null, { status: 204 });
    }
    if (path === "/api/v1/auth/change-password") {
      authorization.push(new Headers(init?.headers).get("authorization"));
      bodies.push(JSON.parse(String(init?.body)));
      active = false;
      return new Response(null, { status: 204 });
    }
    if (path === "/protected") {
      authorization.push(new Headers(init?.headers).get("authorization"));
      protectedCalls += 1;
      return protectedCalls === 1
        ? invalidSession()
        : jsonResponse({ protected: true });
    }

    return jsonResponse(
      { statusCode: 404, code: "NOT_FOUND", message: "Không tìm thấy" },
      404,
    );
  });

  return {
    fetchImplementation,
    paths,
    credentials,
    authorization,
    bodies,
    reactivate: () => {
      active = true;
    },
  };
}

function SessionProbe({ protectedRequest = false }) {
  const auth = useAuth();
  const requestProtected = async () => {
    const result = await auth.authorizedRequest<{ protected: boolean }>(
      "/protected",
    );
    if (result.protected) {
      document.body.dataset.protectedResult = "granted";
    }
  };

  return (
    <div>
      <output aria-label="Trạng thái phiên">{auth.status}</output>
      <output aria-label="Vai trò hiện tại">{auth.user?.role ?? "none"}</output>
      {protectedRequest ? (
        <button type="button" onClick={() => void requestProtected()}>
          Gọi API bảo vệ
        </button>
      ) : null}
    </div>
  );
}

function submitLogin() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " user@example.com " },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "a sufficiently long password" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: /Đăng nhập/ }).closest("form")!,
  );
}

describe("Auth flow integration", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    replace.mockReset();
    delete document.body.dataset.protectedResult;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each<RoleCode>(["CUSTOMER", "SALES_STAFF", "WAREHOUSE_STAFF", "ADMIN"])(
    "logs %s in through the real client boundary and routes its portal",
    async (role) => {
      const server = createFakeAuthServer(role);
      const client = createAuthClient({
        fetchImplementation: server.fetchImplementation,
      });
      render(
        <AuthProvider client={client}>
          <SessionProbe />
          <LoginForm />
        </AuthProvider>,
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Trạng thái phiên")).toHaveTextContent(
          "anonymous",
        ),
      );

      submitLogin();

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith(landingPathForRole(role)),
      );
      expect(screen.getByLabelText("Vai trò hiện tại")).toHaveTextContent(role);
      expect(server.bodies).toContainEqual({
        email: "user@example.com",
        password: "a sufficiently long password",
        remember: false,
      });
      expect(server.credentials.every((value) => value === "include")).toBe(
        true,
      );
    },
  );

  it("restores on reload and refreshes once before retrying a 401", async () => {
    const server = createFakeAuthServer("ADMIN", true);
    const clientAfterReload = createAuthClient({
      fetchImplementation: server.fetchImplementation,
    });
    render(
      <AuthProvider client={clientAfterReload}>
        <SessionProbe protectedRequest />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Trạng thái phiên")).toHaveTextContent(
        "authenticated",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Gọi API bảo vệ" }));

    await waitFor(() =>
      expect(document.body.dataset.protectedResult).toBe("granted"),
    );
    expect(server.paths).toEqual([
      "/api/v1/auth/refresh",
      "/protected",
      "/api/v1/auth/refresh",
      "/protected",
    ]);
    expect(server.authorization).toEqual([
      "Bearer access-1",
      "Bearer access-2",
    ]);
  });

  it("invalidates the client session after change-password and logout", async () => {
    const server = createFakeAuthServer("CUSTOMER", true);
    const firstClient = createAuthClient({
      fetchImplementation: server.fetchImplementation,
    });
    const firstRender = render(
      <AuthProvider client={firstClient}>
        <SessionProbe />
        <ChangePasswordForm />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Trạng thái phiên")).toHaveTextContent(
        "authenticated",
      ),
    );

    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), {
      target: { value: "the current sufficiently long password" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "the new sufficiently long password" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "the new sufficiently long password" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: /Cập nhật mật khẩu/ })
        .closest("form")!,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Trạng thái phiên")).toHaveTextContent(
        "anonymous",
      ),
    );
    expect(server.bodies).toContainEqual({
      currentPassword: "the current sufficiently long password",
      newPassword: "the new sufficiently long password",
    });
    expect(replace).toHaveBeenCalledWith("/auth/login");
    firstRender.unmount();

    server.reactivate();
    replace.mockReset();
    const secondClient = createAuthClient({
      fetchImplementation: server.fetchImplementation,
    });
    render(
      <AuthProvider client={secondClient}>
        <SessionProbe />
        <LogoutButton />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Trạng thái phiên")).toHaveTextContent(
        "authenticated",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Trạng thái phiên")).toHaveTextContent(
        "anonymous",
      ),
    );
    expect(server.paths).toContain("/api/v1/auth/logout");
    expect(replace).toHaveBeenCalledWith("/auth/login");
  });
});
