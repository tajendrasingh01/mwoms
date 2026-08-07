import axios from "axios";

/**
 * Base URL for the MWOMS backend (Node.js/Express + Prisma).
 * Set VITE_API_BASE_URL in .env / .env.local — see .env.example.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // required for session-based auth (Milestone: Authentication)
  headers: {
    "Content-Type": "application/json",
  },
});

// Centralized response error handling. Individual services can still
// catch and handle errors locally, but this keeps cross-cutting
// concerns (e.g. redirecting on 401) in one place.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error("[apiClient] request failed:", error?.response ?? error);
    }
    return Promise.reject(error);
  },
);
