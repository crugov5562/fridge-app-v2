import { create } from 'zustand';
import type { EnrichedItem } from '@/features/scan-receipt/ReceiptScanner';

interface ScanState {
  items: EnrichedItem[];
  purchaseDate: string | null;
  shouldClose: boolean;
  setPending: (items: EnrichedItem[], purchaseDate: string | null) => void;
  updateItem: (idx: number, patch: Partial<EnrichedItem>) => void;
  requestClose: () => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  items: [],
  purchaseDate: null,
  shouldClose: false,
  setPending: (items, purchaseDate) => set({ items, purchaseDate, shouldClose: false }),
  updateItem: (idx, patch) =>
    set((s) => ({
      items: s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    })),
  requestClose: () => set({ shouldClose: true }),
  clear: () => set({ items: [], purchaseDate: null, shouldClose: false }),
}));
