import type { PublicUser } from "@/features/auth/contracts";

export type Profile = PublicUser & {
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
};

export type UpdateProfileInput = {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};
