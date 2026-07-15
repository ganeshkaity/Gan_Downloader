'use client';

import React from 'react';
import { useAppStore } from '@/store';
import Layout from '@/components/layout';
import DashboardView from '@/components/dashboard-view';
import SingleDownloaderView from '@/components/single-downloader-view';
import PlaylistDownloaderView from '@/components/playlist-downloader-view';
import MultipleDownloaderView from '@/components/multiple-downloader-view';
import InstagramDownloaderView from '@/components/instagram-downloader-view';
import HistoryView from '@/components/history-view';
import SettingsView from '@/components/settings-view';
import ConsolePanel from '@/components/console-panel';
import { Terminal, ChevronUp, ChevronDown } from 'lucide-react';

export default function Home() {
  const { activeView, consoleOpen, setConsoleOpen } = useAppStore();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'single':
        return <SingleDownloaderView />;
      case 'playlist':
        return <PlaylistDownloaderView />;
      case 'multiple':
        return <MultipleDownloaderView />;
      case 'instagram':
        return <InstagramDownloaderView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <Layout>
      <div className="relative flex flex-col gap-6 min-h-[calc(100vh-8rem)]">
        
        {/* Active Page View Component */}
        <div className="flex-1 pb-16">
          {renderActiveView()}
        </div>

        {/* Collapsible Bottom Console Terminal Drawer */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-border shadow-2xl transition-all duration-200"
             style={{ height: consoleOpen ? '320px' : '36px' }}
        >
          {/* Drawer Header/Toggle Button */}
          <div 
            onClick={() => setConsoleOpen(!consoleOpen)}
            className="flex items-center justify-between px-6 py-2 bg-zinc-900/90 text-xs font-semibold font-mono text-zinc-400 cursor-pointer border-b border-zinc-800/60 hover:text-white select-none"
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span>Console Logs Output Inspector</span>
            </div>
            <div className="flex items-center gap-1.5 hover:bg-zinc-800 px-2 py-0.5 rounded">
              <span className="text-[10px] text-muted-foreground">
                {consoleOpen ? 'Click to collapse' : 'Click to inspect logs'}
              </span>
              {consoleOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </div>
          </div>

          {/* Console Content */}
          <div className="h-[284px] bg-zinc-950 overflow-hidden">
            {consoleOpen && <ConsolePanel />}
          </div>
        </div>

      </div>
    </Layout>
  );
}
