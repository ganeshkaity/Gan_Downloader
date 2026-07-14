'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store';

export default function ClientBootstrap({ children }: { children: React.ReactNode }) {
  const init = useAppStore((state) => state.init);

  useEffect(() => {
    // Connect socket and fetch basic config
    init();

    // Check localStorage for theme preference
    const savedTheme = localStorage.getItem('gan-downloader-theme') || 'dark';
    useAppStore.getState().setTheme(savedTheme as 'light' | 'dark');
  }, [init]);

  return <>{children}</>;
}
