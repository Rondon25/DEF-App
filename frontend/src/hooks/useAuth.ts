// ── Customer auth ─────────────────────────────────────────────────────────────
export interface DeliveryLocation {
  id: number;
  label: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_primary: boolean;
}

export interface CustomerUser {
  id: number;
  name: string;
  phone_number: string;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  is_credit_account: boolean;
  status: string;
  created_at: string;
  delivery_locations: DeliveryLocation[];
}

export const getCustomerToken  = () => localStorage.getItem("c_token");
export const getCustomerUser   = (): CustomerUser | null => {
  try { return JSON.parse(localStorage.getItem("c_user") || "null"); } catch { return null; }
};
export const setCustomerAuth   = (token: string, user: CustomerUser) => {
  localStorage.setItem("c_token", token);
  localStorage.setItem("c_user", JSON.stringify(user));
};
export const clearCustomerAuth = () => {
  localStorage.removeItem("c_token");
  localStorage.removeItem("c_user");
};
export const isCustomerLoggedIn = () => !!getCustomerToken() && !!getCustomerUser();

// ── Staff auth ────────────────────────────────────────────────────────────────
export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const getStaffToken  = () => localStorage.getItem("s_token");
export const getStaffUser   = (): StaffUser | null => {
  try { return JSON.parse(localStorage.getItem("s_user") || "null"); } catch { return null; }
};
export const setStaffAuth   = (token: string, user: StaffUser) => {
  localStorage.setItem("s_token", token);
  localStorage.setItem("s_user", JSON.stringify(user));
};
export const clearStaffAuth = () => {
  localStorage.removeItem("s_token");
  localStorage.removeItem("s_user");
};
export const isStaffLoggedIn = () => !!getStaffToken() && !!getStaffUser();
