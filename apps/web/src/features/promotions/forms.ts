import { z } from "zod";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const DIGITS = /^\d+$/;

const optionalDigits = z
  .string()
  .trim()
  .refine((v) => v === "" || DIGITS.test(v), "Chỉ nhập số nguyên không âm (VND).");

const optionalCount = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1),
    "Chỉ nhập số nguyên từ 1 trở lên.",
  );

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "Vui lòng nhập mã coupon.")
      .max(50, "Mã coupon tối đa 50 ký tự.")
      .regex(
        CODE_PATTERN,
        "Mã chỉ gồm chữ HOA, số, gạch ngang hoặc gạch dưới; bắt đầu bằng chữ/số.",
      ),
    name: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên chương trình.")
      .max(150, "Tên tối đa 150 ký tự."),
    description: z.string().trim().max(500, "Mô tả tối đa 500 ký tự."),
    type: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]),
    value: z.string().trim().min(1, "Vui lòng nhập giá trị giảm."),
    minOrderAmount: optionalDigits,
    maxDiscountAmount: optionalDigits,
    usageLimit: optionalCount,
    perUserLimit: optionalCount,
    startsAt: z.string().min(1, "Vui lòng chọn thời điểm bắt đầu."),
    endsAt: z.string().min(1, "Vui lòng chọn thời điểm kết thúc."),
    status: z.enum(["ACTIVE", "DISABLED"]),
  })
  .superRefine((values, ctx) => {
    // value depends on type
    if (!DIGITS.test(values.value)) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Giá trị phải là số nguyên không âm.",
      });
    } else if (values.type === "PERCENTAGE") {
      const n = Number(values.value);
      if (n < 1 || n > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Phần trăm giảm phải trong khoảng 1–100.",
        });
      }
    } else if (Number(values.value) < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Số tiền giảm phải lớn hơn 0.",
      });
    }

    // date ordering
    const starts = new Date(values.startsAt).getTime();
    const ends = new Date(values.endsAt).getTime();
    if (!Number.isNaN(starts) && !Number.isNaN(ends) && ends <= starts) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
      });
    }
  });

export type CouponFormValues = z.infer<typeof couponFormSchema>;
