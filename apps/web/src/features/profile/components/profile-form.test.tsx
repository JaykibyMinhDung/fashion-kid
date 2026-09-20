import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import {
  AuthProvider,
  useAuth,
} from "@/features/auth/session/auth-provider";
import type { Profile } from "../contracts";
import { ProfileForm } from "./profile-form";

const PROFILE: Profile = {
  id: "user-id",
  email: "customer@example.com",
  fullName: "Customer Example",
  phone: "+84901234567",
  avatarUrl: null,
  role: "CUSTOMER",
  status: "ACTIVE",
  lastLoginAt: "2026-09-02T10:00:00.000Z",
  createdAt: "2026-09-01T10:00:00.000Z",
};

type RequestHandler = (
  path: `/${string}`,
  init?: RequestInit,
) => Promise<unknown>;

function profileClient(handler: RequestHandler) {
  let currentUser: PublicUser = PROFILE;
  const synchronizeCurrentUser = vi.fn((updated: PublicUser) => {
    currentUser = updated;
  });
  const client: AuthClient = {
    getCurrentUser: () => currentUser,
    synchronizeCurrentUser,
    login: () => Promise.resolve(currentUser),
    register: () => Promise.resolve(currentUser),
    refresh: () => Promise.resolve(currentUser),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>(path: `/${string}`, init?: RequestInit) =>
      handler(path, init) as Promise<T>,
  };
  return { client, synchronizeCurrentUser };
}

function SessionName() {
  return <output data-testid="session-name">{useAuth().user?.fullName}</output>;
}

describe("ProfileForm", () => {
  it("loads the current profile from the protected endpoint", async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    const { client } = profileClient((path, init) => {
      calls.push({ path, init });
      return Promise.resolve(PROFILE);
    });

    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    );

    expect(await screen.findByLabelText("Họ và tên")).toHaveValue(
      PROFILE.fullName,
    );
    expect(screen.getByLabelText("Email")).toHaveValue(PROFILE.email);
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(calls).toEqual([{ path: "/api/v1/me", init: undefined }]);
  });

  it("submits only normalized editable fields and synchronizes the session user", async () => {
    const patchBodies: unknown[] = [];
    const updated: Profile = {
      ...PROFILE,
      fullName: "Updated Customer",
      phone: "+84987654321",
      avatarUrl: "https://cdn.example.com/avatar.png",
    };
    const { client, synchronizeCurrentUser } = profileClient((path, init) => {
      if (init?.method === "PATCH") {
        patchBodies.push(JSON.parse(String(init.body)) as unknown);
        return Promise.resolve(updated);
      }
      return Promise.resolve(PROFILE);
    });

    render(
      <AuthProvider client={client}>
        <SessionName />
        <ProfileForm />
      </AuthProvider>,
    );

    fireEvent.change(await screen.findByLabelText("Họ và tên"), {
      target: { value: "  Updated Customer  " },
    });
    fireEvent.change(screen.getByLabelText("Số điện thoại"), {
      target: { value: "00 84 987-654-321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByText("Đã cập nhật hồ sơ.")).toHaveTextContent(
      "Đã cập nhật hồ sơ.",
    );
    expect(patchBodies).toEqual([
      {
        fullName: "Updated Customer",
        phone: "+84987654321",
      },
    ]);
    expect(synchronizeCurrentUser).toHaveBeenCalledWith(updated);
    await waitFor(() =>
      expect(screen.getByTestId("session-name")).toHaveTextContent(
        "Updated Customer",
      ),
    );
  });

  it("rejects an invalid phone before issuing PATCH", async () => {
    const methods: Array<string | undefined> = [];
    const { client } = profileClient((_path, init) => {
      methods.push(init?.method);
      return Promise.resolve(PROFILE);
    });

    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    );

    fireEvent.change(await screen.findByLabelText("Số điện thoại"), {
      target: { value: "not-a-phone" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Số điện thoại cần có từ 8 đến 15 chữ số",
    );
    expect(methods).toEqual([undefined]);
  });
});
