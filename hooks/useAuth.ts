import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  phone: string | null;
  hasPin: boolean;
  isPinVerified: boolean;

  setAuthenticated: (userId: string, phone: string) => void;
  setPinCreated: () => void;
  setPinVerified: (verified: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// Note: For production, consider using Zustand with expo-secure-store persistence
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  phone: null,
  hasPin: false,
  isPinVerified: false,

  setAuthenticated: (userId, phone) =>
    set({ isAuthenticated: true, userId, phone, isLoading: false }),

  setPinCreated: () => set({ hasPin: true }),

  setPinVerified: (verified) => set({ isPinVerified: verified }),

  setLoading: (loading) => set({ isLoading: loading }),

  logout: () =>
    set({
      isAuthenticated: false,
      userId: null,
      phone: null,
      hasPin: false,
      isPinVerified: false,
      isLoading: false,
    }),
}));
