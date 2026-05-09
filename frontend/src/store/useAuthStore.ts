import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: string | null;
  permissions: string[];
  setAuth: (token: string, role: string) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      permissions: [],
      
      setAuth: (token, role) => set({ token, role }),
      setPermissions: (permissions) => set({ permissions }),
      
      logout: () => {
        set({ token: null, role: null, permissions: [] });
      },
    }), { 
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
