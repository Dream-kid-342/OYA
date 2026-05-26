import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Admin {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      admin: null,
      isAuthenticated: false,
      setAuth: (token, admin) => set({ accessToken: token, admin, isAuthenticated: true }),
      clearAuth: () => set({ accessToken: null, admin: null, isAuthenticated: false }),
    }),
    {
      name: 'oya-admin-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
