import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import type {
  AdminReview,
  AdminReviewListQuery,
  AdminReviewListResponse,
  ModerateReviewInput,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

export function getAdminReviews(
  request: AuthorizedRequest,
  query: AdminReviewListQuery,
): Promise<AdminReviewListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.rating ? { rating: String(query.rating) } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  });
  return request<AdminReviewListResponse>(`/api/v1/admin/reviews?${params}`);
}

export function moderateReview(
  request: AuthorizedRequest,
  id: string,
  input: ModerateReviewInput,
): Promise<AdminReview> {
  return request<AdminReview>(`/api/v1/admin/reviews/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
