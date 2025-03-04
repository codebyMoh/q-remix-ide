import { QueryClient } from "@tanstack/react-query";

// Create a new QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable refetch on window focus
      staleTime: 1000 * 60 * 5, // 5 minutes cache time
    },
  },
});