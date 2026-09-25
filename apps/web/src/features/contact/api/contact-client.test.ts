import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "@/lib/api/api-client";
import { submitContactMessage } from "./contact-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("contact client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("posts the message to the public contact endpoint and omits a blank email", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(201, {
        ticketId: "LH-260925-K3QX7A",
        receivedAt: "2026-09-25T02:30:00.000Z",
      }),
    );

    const result = await submitContactMessage(
      {
        fullName: "Nguyễn Thu Trang",
        phone: "0988123456",
        email: "   ",
        topic: "tu-van-size",
        message: "Bé 3 tuổi mặc size nào?",
      },
      fetchMock,
    );

    expect(result.ticketId).toBe("LH-260925-K3QX7A");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/contact");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      fullName: "Nguyễn Thu Trang",
      phone: "0988123456",
      topic: "tu-van-size",
      message: "Bé 3 tuổi mặc size nào?",
    });
  });

  it("surfaces API validation errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(400, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        requestId: "req-1",
      }),
    );

    await expect(
      submitContactMessage(
        {
          fullName: "A",
          phone: "abc",
          topic: "hop-tac",
          message: "",
        },
        fetchMock,
      ),
    ).rejects.toBeInstanceOf(ApiClientError);
  });
});
