import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Clear legacy storage if it exists to avoid confusion
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('cts-cart-storage');
}

export interface OrderDateSlot {
  date: string;
  slot: string;
  service_type?: string;
}

export interface CartItem {
  meal_id: number;
  name: string;
  price: number;
  dates: OrderDateSlot[]; // Array of date and slot objects
  image_url?: string;
  vendor_id: number;
  kitchen_name?: string;
  is_continuous?: boolean;
}

interface CartState {
  items: CartItem[];
  vendorId: number | null;
  vendorName: string | null;
  setMealDates: (item: Omit<CartItem, 'dates'>, dates: OrderDateSlot[], isContinuous?: boolean) => void;
  removeItem: (mealId: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      vendorId: null,
      vendorName: null,

      setMealDates: (item, dates, isContinuous = false) => {
        const state = get();
        
        if (dates.length === 0) {
           get().removeItem(item.meal_id);
           return;
        }

        // If cart is empty, set the vendor
        if (state.items.length === 0) {
          set({ 
            vendorId: item.vendor_id, 
            vendorName: item.kitchen_name,
            items: [{ ...item, dates, is_continuous: isContinuous }] 
          });
          return;
        }

        // If adding from a different vendor, reset cart
        if (state.vendorId !== item.vendor_id) {
           set({
              vendorId: item.vendor_id,
              vendorName: item.kitchen_name,
              items: [{ ...item, dates, is_continuous: isContinuous }]
           });
           return;
        }

        // If from same vendor, check if already in cart
        const existingItem = state.items.find((i) => i.meal_id === item.meal_id);
        if (existingItem) {
          set({
            items: state.items.map((i) => 
              i.meal_id === item.meal_id 
                ? { ...i, dates, is_continuous: isContinuous } 
                : i
            )
          });
        } else {
          set({ items: [...state.items, { ...item, dates, is_continuous: isContinuous }] });
        }
      },

      removeItem: (mealId) => {
        const state = get();
        const newItems = state.items.filter((i) => i.meal_id !== mealId);
        
        if (newItems.length === 0) {
          set({ items: [], vendorId: null, vendorName: null });
        } else {
          set({ items: newItems });
        }
      },

      clearCart: () => {
        set({ items: [], vendorId: null, vendorName: null });
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.dates.length), 0);
      }
    }),
    {
      name: 'tiffni-cart-storage',
    }
  )
);
