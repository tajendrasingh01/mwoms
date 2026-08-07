import { QueryClient } from "@tanstack/react-query";

/**
 * Single shared QueryClient instance for the app.
 * Defaults are tuned for a mostly-desktop, always-connected enterprise
 * dashboard: short retry count, no refetch storms on window focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
