import { create } from 'zustand';
import { auth, saveToken, removeToken, type UserResponse } from './api';
import { useFridgeStore } from './fridge-store';

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

async function initFridge() {
  try {
    const fridges = await auth.fridges();
    if (fridges.length > 0) {
      await useFridgeStore.getState().setActiveFridgeId(fridges[0].id);
    }
  } catch {
    // fridge init is non-critical — ignore errors
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await auth.login(email, password);
      await saveToken(res.access_token);
      const user = await auth.me();
      await initFridge();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true });
    try {
      const res = await auth.register(email, password, displayName);
      await saveToken(res.access_token);
      const user = await auth.me();
      await initFridge();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await removeToken();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const user = await auth.me();
      await initFridge();
      set({ user, isAuthenticated: true });
    } catch {
      await removeToken();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
