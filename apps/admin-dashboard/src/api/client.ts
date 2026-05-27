import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // for refresh token cookie
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${(import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAuth(newToken, useAuthStore.getState().admin!);
        failedQueue.forEach((p) => p.resolve(newToken));
        failedQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        failedQueue.forEach((p) => p.reject(error));
        failedQueue = [];
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
