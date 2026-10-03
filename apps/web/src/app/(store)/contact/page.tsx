"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  CONTACT_TOPICS,
  submitContactMessage,
  type ContactTopic,
} from "@/features/contact/api/contact-client";
import { withToast } from "@/lib/toast/mutation-toast";

const showrooms = [
  {
    city: "Hà Nội",
    name: "Showroom Mầm Nhỏ - Phố Huế",
    address: "Tầng 2, TTTM Vincom Bà Triệu, 191 Bà Triệu, Q. Hai Bà Trưng, Hà Nội",
    phone: "(024) 3988 6868",
    hours: "08:30 – 21:30 (Cả tuần)",
    note: "Có khu vực vui chơi nhỏ cho bé và chỗ đỗ xe ô tô miễn phí.",
  },
  {
    city: "TP. Hồ Chí Minh",
    name: "Showroom Mầm Nhỏ - Quận 3",
    address: "456 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP. Hồ Chí Minh",
    phone: "(028) 3899 6868",
    hours: "08:30 – 21:30 (Cả tuần)",
    note: "Nằm gần ngã tư CMT8, thuận tiện mua sắm và thử trang phục.",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState<{
    fullName: string;
    phone: string;
    email: string;
    topic: ContactTopic;
    message: string;
  }>({
    fullName: "",
    phone: "",
    email: "",
    topic: "tu-van-size",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const fullNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const topicId = useId();
  const messageId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // API xếp email tới hộp thư CSKH của shop (+ email xác nhận nếu khách nhập email)
      const result = await withToast(submitContactMessage(formData), {
        success: "Đã gửi tin nhắn tới Mầm Nhỏ",
        error: "Không gửi được tin nhắn, vui lòng thử lại hoặc gọi 1900 6868",
      });
      setTicketId(result.ticketId);
      setIsSubmitted(true);
    } catch {
      // Toast lỗi đã hiển thị; giữ nguyên nội dung form để khách gửi lại.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: "",
      phone: "",
      email: "",
      topic: "tu-van-size",
      message: "",
    });
    setIsSubmitted(false);
    setTicketId("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">Liên hệ</span>
      </nav>

      {/* Header */}
      <div className="max-w-3xl">
        <Badge className="mb-3 bg-brand-soft text-brand-strong">Hỗ trợ khách hàng</Badge>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Liên hệ với Mầm Nhỏ
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Đội ngũ chăm sóc khách hàng của Mầm Nhỏ luôn sẵn sàng lắng nghe mọi câu hỏi, ý kiến đóng
          góp và hỗ trợ ba mẹ chọn những bộ trang phục tuyệt vời nhất cho con.
        </p>
      </div>

      {/* Quick Contact Info Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80 bg-surface">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Phone className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Hotline miễn phí
              </p>
              <p className="text-lg font-bold text-foreground">1900 6868</p>
              <p className="text-xs text-muted">8:00 – 21:00 hàng ngày</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-sage">
              <Mail className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Hòm thư điện tử
              </p>
              <p className="text-base font-bold text-foreground">cskh@mamnho.vn</p>
              <p className="text-xs text-muted">Phản hồi trong 2 - 4 giờ</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#fae8e5] text-[#b44339]">
              <MessageSquare className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Tư vấn trực tuyến
              </p>
              <p className="text-base font-bold text-foreground">Zalo & Messenger</p>
              <p className="text-xs text-muted">Hỗ trợ nhanh 24/7</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Contact Form + Showroom Locations */}
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <Card className="border-border/80 bg-surface p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Gửi tin nhắn cho chúng tôi</h2>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                Vui lòng điền thông tin bên dưới, nhân viên phụ trách sẽ gọi điện hoặc gửi email phản
                hồi ngay khi nhận được.
              </p>
            </div>

            {isSubmitted ? (
              <div className="rounded-2xl border border-sage/30 bg-[#f4f8f2] p-6 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-sage-soft text-sage">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">
                  Gửi thông tin thành công!
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Cảm ơn ba/mẹ đã liên hệ với Mầm Nhỏ.
                </p>
                <div className="mx-auto mt-4 max-w-sm rounded-xl bg-white p-3 text-xs text-muted shadow-sm">
                  <span>Mã tiếp nhận yêu cầu: </span>
                  <strong className="font-mono text-brand-strong">{ticketId}</strong>
                  <p className="mt-1">
                    Chuyên viên tư vấn sẽ liên hệ lại qua số{" "}
                    <strong className="text-foreground">{formData.phone || "điện thoại"}</strong>{" "}
                    trong thời gian sớm nhất.
                  </p>
                </div>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="mt-6"
                >
                  Gửi thêm tin nhắn khác
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={fullNameId} className="mb-1.5 block text-xs font-semibold text-foreground">
                      Họ và tên của ba/mẹ <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id={fullNameId}
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="VD: Nguyễn Thu Trang"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={phoneId} className="mb-1.5 block text-xs font-semibold text-foreground">
                      Số điện thoại liên hệ <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id={phoneId}
                      required
                      type="tel"
                      maxLength={20}
                      placeholder="VD: 0988 123 456"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={emailId} className="mb-1.5 block text-xs font-semibold text-foreground">
                      Địa chỉ Email
                    </label>
                    <Input
                      id={emailId}
                      type="email"
                      placeholder="VD: meyeube@gmail.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={topicId} className="mb-1.5 block text-xs font-semibold text-foreground">
                      Chủ đề cần hỗ trợ <span className="text-red-500">*</span>
                    </label>
                    <Select
                      id={topicId}
                      value={formData.topic}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          topic: e.target.value as ContactTopic,
                        })
                      }
                    >
                      {CONTACT_TOPICS.map((topic) => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label htmlFor={messageId} className="mb-1.5 block text-xs font-semibold text-foreground">
                    Nội dung tin nhắn <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id={messageId}
                    required
                    minLength={5}
                    maxLength={2000}
                    placeholder="Mẹ cần hỗ trợ thông tin gì về bé hoặc đơn hàng..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                  size="md"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      <span>Đang gửi thông tin...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Gửi tin nhắn</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Showrooms Column */}
        <div className="space-y-6 lg:col-span-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Hệ thống Cửa hàng Mầm Nhỏ</h2>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Mời ba mẹ và bé ghé thăm showroom để trải nghiệm sờ tận tay chất vải mềm mại và ướm thử
              đồ cho bé:
            </p>
          </div>

          <div className="space-y-4">
            {showrooms.map((store) => (
              <Card key={store.name} className="border-border/80 bg-surface">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">
                      {store.city}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5 text-brand" /> {store.hours}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-foreground">{store.name}</h3>

                  <div className="mt-3 space-y-2 text-xs text-muted">
                    <p className="flex items-start gap-2">
                      <MapPin className="size-4 shrink-0 text-brand" />
                      <span>{store.address}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0 text-brand" />
                      <span className="font-semibold text-foreground">{store.phone}</span>
                    </p>
                  </div>

                  <p className="mt-4 border-t border-border pt-3 text-xs italic text-muted">
                    {store.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Guarantee mini box */}
          <div className="rounded-2xl border border-brand/20 bg-[#faf6f1] p-4 text-xs text-muted">
            <p className="font-semibold text-foreground">⭐ Cam kết chất lượng dịch vụ:</p>
            <p className="mt-1">
              Nhân viên tư vấn thân thiện, không gian mua sắm thoáng mát, phòng thử đồ sạch sẽ và
              được trang bị đồ chơi an toàn để bé giải trí trong lúc mẹ chọn trang phục.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
