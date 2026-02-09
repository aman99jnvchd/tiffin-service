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



export default api;