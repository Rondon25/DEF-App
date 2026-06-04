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
    if (err.response?.status === 401 && getCustomerToken()) {
      clearCustomerAuth();
      window.location.href = "/login";
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
      window.location.href = "/staff/login";
    }
    return Promise.reject(err);
  }
);

export default api;
