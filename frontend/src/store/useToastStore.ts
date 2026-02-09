import { create } from 'zustand';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  show: boolean;
  showToast: (message: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  type: 'success',
  show: false,
  showToast: (message, type = 'success') => {
    set({ message, type, show: true });
    setTimeout(() => set({ show: false }), 7000);
  },
  hideToast: () => set({ show: false }),
}));
