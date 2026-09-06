import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: string | null;
  permissions: string[];
  isOnboardingComplete: boolean;
  dietaryPreference: string | null;
  includeEggs: boolean;
  setAuth: (token: string, role: string, isOnboardingComplete?: boolean, dietaryPreference?: string, includeEggs?: boolean) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      permissions: [],
      isOnboardingComplete: true,
      dietaryPreference: null,
      includeEggs: false,
      
      setAuth: (token, role, isOnboardingComplete = true, dietaryPreference = null, includeEggs = false) => 
        set({ token, role, isOnboardingComplete, dietaryPreference, includeEggs }),
      setPermissions: (permissions) => set({ permissions }),
      
      logout: () => {
        set({ token: null, role: null, permissions: [], isOnboardingComplete: true, dietaryPreference: null, includeEggs: false });
      },
    }), { 
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
