import { z } from "zod";

export const reviewFormSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Vui lòng chọn từ 1 đến 5 sao.")
    .max(5, "Vui lòng chọn từ 1 đến 5 sao."),
  comment: z
    .string()
    .trim()
    .max(2000, "Nội dung tối đa 2000 ký tự."),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
