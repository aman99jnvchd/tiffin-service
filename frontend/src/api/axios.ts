import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';

const api = axios.create({
  baseURL: 'http://localhost:1415/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 check, excluding login and register to allow local error handling
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (error.response?.status === 401 && !isAuthPage) {
      const { logout } = useAuthStore.getState();
      const { showToast } = useToastStore.getState();

      logout();
      showToast("Session Expired, please login again", "error");
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

/* Login a user */
export const loginUser = (data: any) => api.post('/login', data);

/* Register a new user */
export const registerUser = (data: any) => api.post('/register', data);

/* Get current user permissions */
export const getMyPermissions = () => api.get('/me/permissions');

/* Fetch all cities (Existing) */
export const getCities = () => api.get('/cities');

/* Add a new city */
export const addCity = (cityData: { name: string; alias?: string }) =>
  api.post('/cities', cityData);

/* Update city details */
export const updateCity = (cityId: number, cityData: { name: string; alias?: string }) =>
  api.put(`/cities/${cityId}`, cityData);

/* Toggle city active/disabled status (Prevents breaking old orders) */
export const toggleCityStatus = (cityId: number) =>
  api.patch(`/cities/${cityId}/toggle`);






// --- ROLES & PERMISSIONS ---
export const getRoles = (activeOnly?: boolean) =>
  api.get('/roles', activeOnly ? { params: { active_only: true } } : undefined);
export const createRole = (data: any) => api.post('/roles', data);
export const updateRole = (id: number, data: any) => api.put(`/roles/${id}`, data);
export const getPermissions = () => api.get('/permissions');

// --- USERS ---
export const getUsers = () => api.get('/users');
export const getUserById = (id: number) => api.get(`/users/${id}`);
export const updateUser = (
  id: number,
  data: {
    name: string;
    phone: string;
    city_id: number;
    role_id?: number;
    is_blocked?: boolean;
  }
) => api.put(`/users/${id}`, null, { params: data });
export const toggleUserStatus = (id: number) => api.patch(`/users/${id}/toggle-status`);
export const updateUserVendorProfile = (userId: number, data: {
  kitchen_name?: string;
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
  fssai_number?: string;
  delivery_windows?: string;
  service_types?: string;
  dietary_type?: string;
  order_cutoff_hours?: number;
  max_capacity_per_slot?: number;
}) => api.patch(`/users/${userId}/vendor-profile`, data);
export const updateUserPassword = (userId: number, new_password: string) =>
  api.patch(`/users/${userId}/password`, { new_password });

// --- ADDRESSES ---
export const getMyAddresses = () => api.get('/addresses');
export const addUserAddress = (targetUserId: number, data: { label: string; address_text: string; house_no?: string; pincode?: string; google_maps_url?: string; house_photo_url?: string }) =>
  api.post(`/addresses?target_user_id=${targetUserId}`, data);
export const updateUserAddress = (addressId: number, data: { label: string; address_text: string; house_no?: string; pincode?: string; google_maps_url?: string; house_photo_url?: string }) =>
  api.put(`/addresses/${addressId}`, data);
export const deleteUserAddress = (addressId: number) => api.delete(`/addresses/${addressId}`);
export const uploadHousePhoto = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload-house-photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// --- CATEGORIES ---
export const getCategories = (vendorId?: number) =>
  api.get('/categories', vendorId ? { params: { vendor_id: vendorId } } : undefined);
export const createCategory = (vendorId: number, data: { name: string }) => api.post(`/categories?vendor_id=${vendorId}`, data);
export const updateCategory = (id: number, data: { name: string }) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

// --- MEALS ---
export const getMeals = (vendorId?: number) =>
  api.get('/meals', vendorId ? { params: { vendor_id: vendorId } } : undefined);
export const createMeal = (vendorId: number, data: any) => api.post(`/meals?vendor_id=${vendorId}`, data);
export const updateMeal = (mealId: number, data: any) => api.put(`/meals/${mealId}`, data);
export const uploadMealImage = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload-meal-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// --- MY PROFILE (self) ---
export const getMyProfile = () => api.get('/me');
export const updateMyProfile = (data: { name: string; phone: string; city_id: number; dietary_preference?: string; include_eggs?: boolean }) => api.put('/me', data);
export const changeMyPassword = (data: { current_password: string; new_password: string; confirm_password: string }) =>
  api.patch('/me/password', data);
export const updateMyVendorProfile = (data: {
  kitchen_name?: string;
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
  fssai_number?: string;
  delivery_windows?: string;
  service_types?: string;
  dietary_type?: string;
  order_cutoff_hours?: number;
  max_capacity_per_slot?: number;
}) => api.patch('/vendor-profile/settings', data);
// --- PUBLIC ---
export const getVendors = (dietaryPref?: string | null, includeEggs?: boolean) => 
  api.get('/vendors', { params: { dietary_preference: dietaryPref, include_eggs: includeEggs } });

// Unified public menu — no vendorId = all active meals, with vendorId = that vendor's meals
export const getPublicMenu = (vendorId?: number, dietaryPref?: string | null, includeEggs?: boolean) =>
  api.get('/menu', { params: { vendor_id: vendorId, dietary_preference: dietaryPref, include_eggs: includeEggs } });
export const searchPublic = (q: string, dietaryPref?: string | null, includeEggs?: boolean) => 
  api.get('/search', { params: { q, dietary_preference: dietaryPref, include_eggs: includeEggs } });

// --- ORDERS ---
export const placeOrder = (data: any) => api.post('/place-order', data);
export const getVendorOrders = () => api.get('/vendor/active-orders');
export const updateOrderStatus = (orderId: number, status: string) => api.patch(`/orders/${orderId}/status?new_status=${status}`);
export const getCustomerActiveOrders = () => api.get('/customer/active-orders');
export const getCustomerOrderHistory = () => api.get('/customer/order-history');
export const cancelCustomerOrder = (orderId: number) => api.patch(`/customer/orders/${orderId}/cancel`);
export const submitOrderFeedback = (orderId: number, data: any) => api.patch(`/customer/orders/${orderId}/feedback`, data);

// --- SUBSCRIPTIONS ---
export const getCustomerSubscriptions = () => api.get('/customer/subscriptions');
export const updateCustomerSubscription = (subId: number, data: any) => api.patch(`/customer/subscriptions/${subId}`, data);

// --- WALLET ---
export const getCustomerWallet = () => api.get('/customer/wallet');
export const rechargeWallet = (amount: number) => api.post('/customer/wallet/recharge', { amount });



/* Update vendor onboarding step */
export const updateVendorOnboardingStep = (step: number, data: any) =>
  api.patch(`/onboarding/step-${step}`, data);
