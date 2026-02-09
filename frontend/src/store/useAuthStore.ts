import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: string | null;
  setAuth: (token: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      
      setAuth: (token, role) => set({ token, role }),
      
      logout: () => {
        set({ token: null, role: null });
      },
    }), { 
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
