import type { AuthContextValue } from "@/features/auth/session/auth-provider";
import { apiRequest } from "@/lib/api/api-client";
import type {
  CreateReviewInput,
  PublicReviewListQuery,
  PublicReviewListResponse,
  Review,
  ReviewListResponse,
  UpdateReviewInput,
} from "../contracts";

type AuthorizedRequest = AuthContextValue["authorizedRequest"];

/** Public endpoint — no authentication required. */
export function getPublicReviews(
  productId: string,
  query: PublicReviewListQuery,
): Promise<PublicReviewListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.rating ? { rating: String(query.rating) } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
  });
  return apiRequest<PublicReviewListResponse>(
    `/api/v1/products/${productId}/reviews?${params}`,
  );
}

export function getMyReviews(
  request: AuthorizedRequest,
  query: { page: number; limit: number },
): Promise<ReviewListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  return request<ReviewListResponse>(`/api/v1/me/reviews?${params}`);
}

export function createReview(
  request: AuthorizedRequest,
  input: CreateReviewInput,
): Promise<Review> {
  return request<Review>("/api/v1/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateReview(
  request: AuthorizedRequest,
  id: string,
  input: UpdateReviewInput,
): Promise<Review> {
  return request<Review>(`/api/v1/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
