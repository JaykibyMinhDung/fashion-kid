import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiRequest, apiBlobRequest } from "./api-client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses JSON success and always includes credentials", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ value: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
    );

    await expect(
      apiRequest<{ value: string }>(
        "/probe",
        { method: "POST", body: JSON.stringify({ input: true }) },
        fetchMock,
      ),
    ).resolves.toEqual({ value: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/probe",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("maps 204 to an undefined result without parsing a body", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      apiRequest<void>("/api/v1/auth/logout", { method: "POST" }, fetchMock),
    ).resolves.toBeUndefined();
  });

  it("throws the stable API error contract", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không hợp lệ",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const error = await apiRequest("/api/v1/auth/login", {}, fetchMock).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email hoặc mật khẩu không hợp lệ",
    });
  });

  it.each([
    new Response("not-json", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }),
    new Response("{invalid", {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    new Response(JSON.stringify({ unexpected: true }), {
      status: 500,
      headers: { "content-type": "application/json" },
    }),
  ])("rejects a malformed response", async (response) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(apiRequest("/probe", {}, fetchMock)).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });
});

describe("apiBlobRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns Blob and parses filename from Content-Disposition header", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fakeBlobData = "test-blob-content";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(fakeBlobData, {
        status: 200,
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": 'attachment; filename="bao-cao-tong-hop.xlsx"',
        },
      }),
    );

    const result = await apiBlobRequest(
      "/api/v1/reporting/export/workbook",
      {},
      fetchMock,
    );

    expect(result.filename).toBe("bao-cao-tong-hop.xlsx");
    expect(result.contentType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(result.blob).toBeDefined();
  });

  it("throws ApiClientError when server returns error JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "Không có quyền truy cập",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(
      apiBlobRequest("/api/v1/reporting/export/workbook", {}, fetchMock),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Không có quyền truy cập",
    });
  });
});
