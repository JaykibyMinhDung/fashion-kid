import { z } from "zod";

const PASSWORD_MIN_LENGTH = 15;
const PASSWORD_MAX_LENGTH = 128;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Vui lòng nhập email và mật khẩu hợp lệ."),
  password: z
    .string()
    .min(1, "Vui lòng nhập email và mật khẩu hợp lệ."),
  remember: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Vui lòng nhập họ tên và email hợp lệ.")
      .max(150, "Họ và tên không được vượt quá 150 ký tự."),
    email: z.string().trim().email("Vui lòng nhập họ tên và email hợp lệ."),
    phone: z
      .string()
      .trim()
      .max(30, "Số điện thoại không hợp lệ.")
      .optional(),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "Mật khẩu cần dài từ 15 đến 128 ký tự.")
      .max(PASSWORD_MAX_LENGTH, "Mật khẩu cần dài từ 15 đến 128 ký tự."),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Xác nhận mật khẩu chưa khớp.",
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "Mật khẩu mới cần dài từ 15 đến 128 ký tự.")
      .max(PASSWORD_MAX_LENGTH, "Mật khẩu mới cần dài từ 15 đến 128 ký tự."),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.newPassword === values.currentPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
      });
    }
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Xác nhận mật khẩu mới chưa khớp.",
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ."),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ."),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Mã OTP phải gồm đúng 6 chữ số."),
});
export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "Mật khẩu mới cần dài từ 15 đến 128 ký tự.")
      .max(PASSWORD_MAX_LENGTH, "Mật khẩu mới cần dài từ 15 đến 128 ký tự."),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Xác nhận mật khẩu mới chưa khớp.",
      });
    }
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ."),
});
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;
