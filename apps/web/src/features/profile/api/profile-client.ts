import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type { Profile, UpdateProfileInput } from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function getProfile(request: AuthorizedRequest): Promise<Profile> {
  return request<Profile>("/api/v1/me");
}

export function updateProfile(
  request: AuthorizedRequest,
  input: UpdateProfileInput,
): Promise<Profile> {
  return request<Profile>("/api/v1/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
