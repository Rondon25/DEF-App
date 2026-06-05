import axios from "axios";
import { getCustomerToken, clearCustomerAuth, getStaffToken, clearStaffAuth } from "../hooks/useAuth";

// ── Customer API ──────────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: "/" });

api.interceptors.request.use((config) => {
  const token = getCustomerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Try to refresh first, then redirect
      const token = getCustomerToken();
      if (token) {
        clearCustomerAuth();
        // Set a flag so the login page shows "session expired" message
        sessionStorage.setItem("session_expired", "1");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Staff API ─────────────────────────────────────────────────────────────────
export const staffApi = axios.create({ baseURL: "/" });

staffApi.interceptors.request.use((config) => {
  const token = getStaffToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

staffApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getStaffToken()) {
      clearStaffAuth();
      sessionStorage.setItem("session_expired", "1");
      window.location.href = "/staff/login";
    }
    return Promise.reject(err);
  }
);

export default api;
