import { apiClient } from "@/services/api-client";
import type { LoginPayload, SessionUser } from "@/types/auth";

export async function loginRequest(payload: LoginPayload): Promise<SessionUser> {
  const { data } = await apiClient.post<{ user: SessionUser }>(
    "/auth/login",
    payload,
  );
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

/**
 * Returns the current session's user, or null if not authenticated.
 * Deliberately resolves to null on a 401 instead of throwing, so
 * callers (the auth bootstrap query) can treat "logged out" as a
 * normal, expected state rather than an error.
 */
export async function fetchCurrentUser(): Promise<SessionUser | null> {
  try {
    const { data } = await apiClient.get<{ user: SessionUser }>("/auth/me");
    return data.user;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 401
    ) {
      return null;
    }
    throw error;
  }
}
