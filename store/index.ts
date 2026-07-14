import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { QueueItem, AppSettings, HealthStatus } from '../types';

interface AppState {
  socket: Socket | null;
  queue: QueueItem[];
  health: HealthStatus | null;
  settings: AppSettings | null;
  activeView: string;
  theme: 'light' | 'dark';
  connected: boolean;
  selectedQueueItemId: string | null;
  logMap: Record<string, string[]>;
  
  // Actions
  init: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveView: (view: string) => void;
  setSelectedQueueItemId: (id: string | null) => void;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  fetchHealth: () => Promise<void>;
  
  // Queue operations
  addToQueue: (url: string, format?: string, platform?: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  deleteQueueItem: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const BACKEND_URL = 'http://localhost:3001';

export const useAppStore = create<AppState>((set, get) => ({
  socket: null,
  queue: [],
  health: null,
  settings: null,
  activeView: 'dashboard',
  theme: 'dark',
  connected: false,
  selectedQueueItemId: null,
  logMap: {},

  init: () => {
    if (get().socket) return; // Already initialized

    const socket = io(BACKEND_URL);

    socket.on('connect', () => {
      set({ connected: true });
      get().fetchHealth();
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('queue-update', (queue: QueueItem[]) => {
      // Merge logs from queue updates into logMap
      const logMap = { ...get().logMap };
      for (const item of queue) {
        logMap[item.id] = item.logs || [];
      }
      set({ queue, logMap });
    });

    socket.on('download-log', (data: { itemId: string; log: string }) => {
      const logMap = { ...get().logMap };
      if (!logMap[data.itemId]) {
        logMap[data.itemId] = [];
      }
      logMap[data.itemId] = [...logMap[data.itemId], data.log];
      set({ logMap });
    });

    set({ socket });

    // Initial fetches
    get().fetchSettings();
    get().fetchHealth();
    
    // Poll health check every 10 seconds
    setInterval(() => {
      get().fetchHealth();
    }, 10000);
  },

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('gan-downloader-theme', theme);
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  },

  setActiveView: (activeView) => set({ activeView }),
  setSelectedQueueItemId: (selectedQueueItemId) => set({ selectedQueueItemId }),

  fetchSettings: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings`);
      if (res.ok) {
        const settings = await res.json();
        set({ settings });
        
        // Match theme preferences
        if (settings.theme) {
          get().setTheme(settings.theme);
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings from backend:', e);
    }
  },

  updateSettings: async (settings) => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const updated = await res.json();
        set({ settings: updated });
        if (settings.theme) {
          get().setTheme(settings.theme as 'dark' | 'light');
        }
      }
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  },

  fetchHealth: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      if (res.ok) {
        const health = await res.json();
        set({ health });
      } else {
        set({ health: null });
      }
    } catch (e) {
      set({ health: null });
    }
  },

  addToQueue: async (url, format, platform) => {
    try {
      await fetch(`${BACKEND_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format, platform })
      });
    } catch (e) {
      console.error('Failed to add to queue:', e);
    }
  },

  cancelDownload: async (id) => {
    try {
      await fetch(`${BACKEND_URL}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to cancel download:', e);
    }
  },

  retryDownload: async (id) => {
    try {
      await fetch(`${BACKEND_URL}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to retry download:', e);
    }
  },

  deleteQueueItem: async (id) => {
    try {
      await fetch(`${BACKEND_URL}/history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      // Also delete from queue endpoints
      await fetch(`${BACKEND_URL}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  },

  clearQueue: async () => {
    try {
      const queue = get().queue;
      for (const item of queue) {
        await get().cancelDownload(item.id);
      }
    } catch (e) {
      console.error('Failed to clear queue:', e);
    }
  }
}));
