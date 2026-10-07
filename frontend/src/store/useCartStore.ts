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
  id: string; // Composite: meal_id + "_" + service_type
  meal_id: number;
  service_type: string;
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
  setMealDates: (item: Omit<CartItem, 'dates' | 'id' | 'service_type'>, dates: OrderDateSlot[], serviceType: string, isContinuous?: boolean) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      vendorId: null,
      vendorName: null,

      setMealDates: (item, dates, serviceType, isContinuous = false) => {
        const state = get();
        const cartItemId = `${item.meal_id}_${serviceType || 'none'}`;
        
        if (dates.length === 0) {
           get().removeItem(cartItemId);
           return;
        }

        // If cart is empty, set the vendor
        if (state.items.length === 0) {
          set({ 
            vendorId: item.vendor_id, 
            vendorName: item.kitchen_name,
            items: [{ ...item, id: cartItemId, service_type: serviceType, dates, is_continuous: isContinuous }] 
          });
          return;
        }

        // If adding from a different vendor, reset cart
        if (state.vendorId !== item.vendor_id) {
           set({
              vendorId: item.vendor_id,
              vendorName: item.kitchen_name,
              items: [{ ...item, id: cartItemId, service_type: serviceType, dates, is_continuous: isContinuous }]
           });
           return;
        }

        // If from same vendor, check if already in cart by ID
        const existingItem = state.items.find((i) => i.id === cartItemId);
        if (existingItem) {
          set({
            items: state.items.map((i) => 
              i.id === cartItemId 
                ? { ...i, dates, is_continuous: isContinuous } 
                : i
            )
          });
        } else {
          set({ items: [...state.items, { ...item, id: cartItemId, service_type: serviceType, dates, is_continuous: isContinuous }] });
        }
      },

      removeItem: (cartItemId) => {
        const state = get();
        const newItems = state.items.filter((i) => i.id !== cartItemId);
        
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
