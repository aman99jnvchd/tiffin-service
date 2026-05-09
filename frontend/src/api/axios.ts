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
export const getRoles = () => api.get('/roles');
export const createRole = (data) => api.post('/roles', data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
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
}) => api.patch(`/users/${userId}/vendor-profile`, data);
export const updateUserPassword = (userId: number, new_password: string) =>
  api.patch(`/users/${userId}/password`, { new_password });

// --- ADDRESSES ---
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
export const updateMyProfile = (data: { name: string; phone: string; city_id: number }) => api.put('/me', data);
export const changeMyPassword = (data: { current_password: string; new_password: string; confirm_password: string }) =>
  api.patch('/me/password', data);
export const updateMyVendorProfile = (data: { kitchen_name?: string; is_open?: boolean; open_time?: string; close_time?: string }) =>
  api.patch('/vendor-profile/settings', data);

export const updateVendorSettings = (data: {
  kitchen_name?: string;
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
}) => api.patch('/vendor-profile/settings', data);

// --- PUBLIC ---
export const getVendors = () => api.get('/vendors');
export const getVendorMenu = (vendorId: number) => api.get(`/vendor/${vendorId}/menu`);
// Unified public menu — no vendorId = all active meals, with vendorId = that vendor's meals
export const getPublicMenu = (vendorId?: number) =>
  api.get('/menu', vendorId ? { params: { vendor_id: vendorId } } : undefined);
export const searchPublic = (q: string) => api.get('/search', { params: { q } });

export default api;
