import * as React from "react";
import { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCurrentUser, loginRequest, logoutRequest } from "@/services/auth.service";
import type { LoginPayload, SessionUser } from "@/types/auth";

const CURRENT_USER_QUERY_KEY = ["auth", "current-user"] as const;

interface AuthState {
  user: SessionUser | null;
  /** True while the initial session check is in flight (on app load / refresh). */
  isLoadingSession: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity, // session doesn't go stale on its own; we invalidate explicitly
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    },
  });

  const value = useMemo<AuthState>(
    () => ({
      user: sessionQuery.data ?? null,
      isLoadingSession: sessionQuery.isLoading,
      isLoggingIn: loginMutation.isPending,
      loginError: loginMutation.error
        ? getErrorMessage(loginMutation.error)
        : null,
      login: async (payload) => {
        await loginMutation.mutateAsync(payload);
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
    }),
    [
      sessionQuery.data,
      sessionQuery.isLoading,
      loginMutation,
      logoutMutation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response
      ?.data?.error === "string"
  ) {
    return (error as { response: { data: { error: string } } }).response.data
      .error;
  }
  return "Something went wrong. Please try again.";
}
