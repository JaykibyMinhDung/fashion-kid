import { apiRequest } from "@/lib/api/api-client";

export const CONTACT_TOPICS = [
  { value: "tu-van-size", label: "Tư vấn chọn size & mẫu mã" },
  { value: "doi-tra-hang", label: "Hỗ trợ đổi trả đơn hàng" },
  { value: "tra-cuu-don", label: "Tra cứu tiến độ giao hàng" },
  { value: "gop-y-dich-vu", label: "Góp ý chất lượng dịch vụ" },
  { value: "hop-tac", label: "Hợp tác kinh doanh & Đại lý" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export type ContactMessageInput = {
  fullName: string;
  phone: string;
  /** Để trống nếu khách không muốn nhận email xác nhận. */
  email?: string;
  topic: ContactTopic;
  message: string;
};

export type ContactSubmission = {
  ticketId: string;
  receivedAt: string;
};

/** Form liên hệ công khai: API xếp email tới hộp thư CSKH và email xác nhận cho khách. */
export function submitContactMessage(
  input: ContactMessageInput,
  fetchImplementation?: typeof fetch,
): Promise<ContactSubmission> {
  const email = input.email?.trim();
  return apiRequest<ContactSubmission>(
    "/api/v1/contact",
    {
      method: "POST",
      body: JSON.stringify({ ...input, email: email ? email : undefined }),
    },
    fetchImplementation,
  );
}
