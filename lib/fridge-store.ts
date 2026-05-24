import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'active_fridge_id';

interface FridgeState {
  activeFridgeId: string | null;
  setActiveFridgeId: (id: string) => Promise<void>;
  loadActiveFridgeId: () => Promise<void>;
}

export const useFridgeStore = create<FridgeState>((set) => ({
  activeFridgeId: null,

  setActiveFridgeId: async (id) => {
    await SecureStore.setItemAsync(KEY, id);
    set({ activeFridgeId: id });
  },

  loadActiveFridgeId: async () => {
    const id = await SecureStore.getItemAsync(KEY);
    if (id) set({ activeFridgeId: id });
  },
}));
