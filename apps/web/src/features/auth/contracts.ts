export const ROLE_CODES = [
  "CUSTOMER",
  "SALES_STAFF",
  "WAREHOUSE_STAFF",
  "ADMIN",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: RoleCode;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: PublicUser;
};

export type LoginInput = {
  email: string;
  password: string;
  remember: boolean;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  remember: boolean;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type VerifyOtpInput = {
  email: string;
  otp: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

export type VerifyEmailInput = {
  token: string;
};

export type ResendVerificationInput = {
  email: string;
};

export type {
  ApiError,
  ApiErrorCode,
} from "@/lib/api/contracts";
export { isApiError } from "@/lib/api/contracts";
