/** Chủ đề liên hệ — khớp với các lựa chọn trong form /contact của web. */
export const CONTACT_TOPICS = {
  'tu-van-size': 'Tư vấn chọn size & mẫu mã',
  'doi-tra-hang': 'Hỗ trợ đổi trả đơn hàng',
  'tra-cuu-don': 'Tra cứu tiến độ giao hàng',
  'gop-y-dich-vu': 'Góp ý chất lượng dịch vụ',
  'hop-tac': 'Hợp tác kinh doanh & Đại lý',
} as const;

export type ContactTopic = keyof typeof CONTACT_TOPICS;

export const CONTACT_TOPIC_VALUES = Object.keys(
  CONTACT_TOPICS,
) as ContactTopic[];
