import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AuthClient } from "@/features/auth/api/auth-client";
import type { PublicUser } from "@/features/auth/contracts";
import { AuthProvider } from "@/features/auth/session/auth-provider";
import type { Address } from "../contracts";
import { AddressBook } from "./address-book";

const USER: PublicUser = {
  id: "user-id",
  email: "customer@example.com",
  fullName: "Customer Example",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
};

const FIRST_ADDRESS: Address = {
  id: "address-a",
  receiverName: "Người nhận A",
  phone: "+84901234567",
  addressLine: "12 Nguyễn Trãi",
  wardCode: "WARD-A",
  wardName: "Phường A",
  provinceCode: "PROVINCE-A",
  provinceName: "Tỉnh A",
  note: null,
  isDefault: true,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const SECOND_ADDRESS: Address = {
  ...FIRST_ADDRESS,
  id: "address-b",
  receiverName: "Người nhận B",
  addressLine: "25 Trần Phú",
  wardCode: "WARD-B",
  wardName: "Phường B",
  provinceCode: "PROVINCE-B",
  provinceName: "Tỉnh B",
  isDefault: false,
};

type RequestHandler = (
  path: `/${string}`,
  init?: RequestInit,
) => Promise<unknown>;

function authClient(handler: RequestHandler): AuthClient {
  return {
    getCurrentUser: () => USER,
    synchronizeCurrentUser: () => undefined,
    login: () => Promise.resolve(USER),
    register: () => Promise.resolve(USER),
    refresh: () => Promise.resolve(USER),
    logout: () => Promise.resolve(),
    changePassword: () => Promise.resolve(),
    authorizedRequest: <T,>(path: `/${string}`, init?: RequestInit) =>
      handler(path, init) as Promise<T>,
  };
}

function renderAddressBook(handler: RequestHandler) {
  return render(
    <AuthProvider client={authClient(handler)}>
      <AddressBook />
    </AuthProvider>,
  );
}

function fillAddressForm() {
  const values: Record<string, string> = {
    "Tên người nhận": "  Người nhận mới  ",
    "Số điện thoại": "00 84 987-654-321",
    "Địa chỉ chi tiết": " 30 Lê Lợi ",
    "Mã phường/xã": " WARD-C ",
    "Phường/xã": " Phường C ",
    "Mã tỉnh/thành": " PROVINCE-C ",
    "Tỉnh/thành": " Tỉnh C ",
    "Ghi chú": " Gọi trước khi giao ",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("AddressBook", () => {
  it("loads and renders the server-ordered address list", async () => {
    const calls: string[] = [];
    renderAddressBook((path) => {
      calls.push(path);
      return Promise.resolve([FIRST_ADDRESS, SECOND_ADDRESS]);
    });

    expect(await screen.findByText("Người nhận A")).toBeInTheDocument();
    expect(screen.getByText("Người nhận B")).toBeInTheDocument();
    expect(screen.getByText("Mặc định")).toBeInTheDocument();
    expect(screen.getByText("12 Nguyễn Trãi, Phường A, Tỉnh A")).toBeInTheDocument();
    expect(calls).toEqual(["/api/v1/me/addresses"]);
  });

  it("creates a normalized address and refetches only after success", async () => {
    let addresses = [FIRST_ADDRESS];
    const postedBodies: unknown[] = [];
    renderAddressBook((path, init) => {
      if (init?.method === "POST") {
        postedBodies.push(JSON.parse(String(init.body)) as unknown);
        addresses = [
          FIRST_ADDRESS,
          {
            ...SECOND_ADDRESS,
            id: "address-c",
            receiverName: "Người nhận mới",
          },
        ];
        return Promise.resolve(addresses[1]);
      }
      return Promise.resolve(addresses);
    });

    await screen.findByText("Người nhận A");
    fireEvent.click(screen.getByRole("button", { name: "Thêm địa chỉ" }));
    fillAddressForm();
    fireEvent.click(screen.getByLabelText("Đặt làm địa chỉ mặc định"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));

    expect(await screen.findByText("Đã thêm địa chỉ.")).toBeInTheDocument();
    expect(postedBodies).toEqual([
      {
        receiverName: "Người nhận mới",
        phone: "+84987654321",
        addressLine: "30 Lê Lợi",
        wardCode: "WARD-C",
        wardName: "Phường C",
        provinceCode: "PROVINCE-C",
        provinceName: "Tỉnh C",
        note: "Gọi trước khi giao",
        isDefault: true,
      },
    ]);
  });

  it("edits without sending default or ownership fields", async () => {
    let addresses = [FIRST_ADDRESS];
    const patchBodies: unknown[] = [];
    renderAddressBook((path, init) => {
      if (init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        patchBodies.push(body);
        addresses = [{ ...FIRST_ADDRESS, receiverName: String(body.receiverName) }];
        return Promise.resolve(addresses[0]);
      }
      return Promise.resolve(addresses);
    });

    await screen.findByText("Người nhận A");
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByLabelText("Tên người nhận"), {
      target: { value: "Người nhận đã sửa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));

    expect(await screen.findByText("Đã cập nhật địa chỉ.")).toBeInTheDocument();
    expect(patchBodies).toHaveLength(1);
    expect(patchBodies[0]).toEqual(
      expect.objectContaining({ receiverName: "Người nhận đã sửa" }),
    );
    expect(patchBodies[0]).not.toHaveProperty("isDefault");
    expect(patchBodies[0]).not.toHaveProperty("userId");
  });

  it("sets default and confirms deletion through dedicated actions", async () => {
    let addresses = [FIRST_ADDRESS, SECOND_ADDRESS];
    const mutations: Array<{ path: string; method?: string }> = [];
    renderAddressBook((path, init) => {
      if (init?.method === "PATCH") {
        mutations.push({ path, method: init.method });
        addresses = [
          { ...SECOND_ADDRESS, isDefault: true },
          { ...FIRST_ADDRESS, isDefault: false },
        ];
        return Promise.resolve(addresses[0]);
      }
      if (init?.method === "DELETE") {
        mutations.push({ path, method: init.method });
        addresses = [{ ...FIRST_ADDRESS, isDefault: true }];
        return Promise.resolve(undefined);
      }
      return Promise.resolve(addresses);
    });

    await screen.findByText("Người nhận B");
    fireEvent.click(screen.getByRole("button", { name: "Đặt mặc định" }));
    expect(await screen.findByText("Đã đổi địa chỉ mặc định.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Xóa" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Xóa ngay" }));
    expect(await screen.findByText("Đã xóa địa chỉ.")).toBeInTheDocument();
    expect(mutations).toEqual([
      {
        path: "/api/v1/me/addresses/address-b/default",
        method: "PATCH",
      },
      { path: "/api/v1/me/addresses/address-b", method: "DELETE" },
    ]);
  });

  it("blocks invalid phone input before mutation", async () => {
    const methods: Array<string | undefined> = [];
    renderAddressBook((_path, init) => {
      methods.push(init?.method);
      return Promise.resolve([]);
    });

    await screen.findByText("Chưa có địa chỉ nhận hàng");
    fireEvent.click(
      screen.getByRole("button", { name: "Thêm địa chỉ đầu tiên" }),
    );
    fillAddressForm();
    fireEvent.change(screen.getByLabelText("Số điện thoại"), {
      target: { value: "invalid-phone" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Số điện thoại cần có từ 8 đến 15 chữ số",
    );
    expect(methods).toEqual([undefined]);
  });

  it("offers retry after initial load failure", async () => {
    let attempts = 0;
    renderAddressBook(() => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error("network unavailable"))
        : Promise.resolve([FIRST_ADDRESS]);
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể xử lý sổ địa chỉ",
    );
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    await waitFor(() => expect(screen.getByText("Người nhận A")).toBeInTheDocument());
    expect(attempts).toBe(2);
  });
});
